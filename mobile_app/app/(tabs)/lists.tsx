import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import { api, ShoppingList, ListItem, BillEstimate, AlternativeItem } from '@/services/api';

export default function ListsScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [estimate, setEstimate] = useState<BillEstimate | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [savings, setSavings] = useState(0);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchActiveList = async () => {
    if (!isSignedIn) {
      setActiveList(null);
      setAlternatives([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getShoppingLists();
      const lists = res.data || [];

      if (lists.length > 0) {
        const fullListRes = await api.getShoppingList(lists[0].id);
        setActiveList(fullListRes.data);

        // Fetch estimate
        const estimateRes = await api.estimateBill(lists[0].id).catch(() => null);
        if (estimateRes?.data) {
          setEstimate(estimateRes.data);
        }

        // Fetch AI alternative recommendations
        const altsRes = await api.getAlternatives(lists[0].id).catch(() => null);
        if (altsRes?.data?.substitutions) {
          setAlternatives(altsRes.data.substitutions);
          setSavings(altsRes.data.potentialTotalSavings || 0);
        } else {
          setAlternatives([]);
          setSavings(0);
        }
      } else {
        setActiveList(null);
        setAlternatives([]);
      }
    } catch (err: any) {
      console.log('Error fetching list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActiveList();
    }, [])
  );

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await api.createShoppingList(newListName.trim(), 75, 'GBP');
      setActiveList(res.data);
      setShowCreateModal(false);
      setNewListName('');
      fetchActiveList();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleUpdateQuantity = async (item: ListItem, delta: number) => {
    if (!activeList) return;
    const currentQty = Math.round(Number(item.quantity) || 1);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      // Remove item
      await api.deleteListItem(activeList.id, item.id);
    } else {
      await api.updateListItem(activeList.id, item.id, { quantity: newQty });
    }
    fetchActiveList();
  };

  const handleTogglePurchased = async (item: ListItem) => {
    if (!activeList) return;
    await api.updateListItem(activeList.id, item.id, { isPurchased: !item.isPurchased });
    fetchActiveList();
  };

  const handleSwapItem = async (alt: AlternativeItem) => {
    if (!activeList) return;
    try {
      setSwappingId(alt.originalProductId);
      const originalItem = activeList.items?.find((i) => i.productId === alt.originalProductId);
      const qty = originalItem ? originalItem.quantity : 1;

      // Add suggested alternative product to the list
      await api.addItemToList(activeList.id, alt.suggestedProductId, qty);
      // Remove more expensive original item if present
      if (originalItem) {
        await api.deleteListItem(activeList.id, originalItem.id);
      }
      fetchActiveList();
    } catch (err: any) {
      fetchActiveList();
    } finally {
      setSwappingId(null);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeList || !activeList.items || activeList.items.length === 0) {
      Alert.alert('Empty List', 'Add products to your list before completing a trip.');
      return;
    }

    Alert.alert(
      'Complete Shopping Trip',
      'This will record your purchases and automatically add items into your Pantry inventory. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Restock',
          onPress: async () => {
            try {
              setCompleting(true);
              const itemsToSave = activeList.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.product?.defaultUnitPrice || 10,
              }));

              await api.recordShoppingTrip({
                shoppingListId: activeList.id,
                updatePantry: true,
                items: itemsToSave,
                notes: 'Completed in mobile app',
              });

              Alert.alert(
                'Trip Recorded! 🎉',
                'Your purchases have been saved to History and your Pantry inventory has been updated.'
              );
              fetchActiveList();
            } catch (err: any) {
              Alert.alert('Notice', 'Trip simulated locally. Sign in to sync cloud history.');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const items = activeList?.items || [];
  const totalCalculated = items.reduce(
    (sum, i) => sum + (Number(i.product?.defaultUnitPrice) || 0) * (Number(i.quantity) || 1),
    0
  );
  const budget = Number(activeList?.budget) || 75;
  const isOverBudget = totalCalculated > budget;

  return (
    <View style={styles.container}>
      {/* Sign In Required Banner for Unauthenticated Users */}
      {!isSignedIn && (
        <View style={styles.authBanner}>
          <Ionicons name="lock-closed" size={18} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.authBannerTitle}>Sign in to save your grocery list</Text>
            <Text style={styles.authBannerSub}>Sync with your cloud account & bill history.</Text>
          </View>
          <TouchableOpacity style={styles.authBannerBtn} onPress={() => router.push('/profile')}>
            <Text style={styles.authBannerBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Estimate & Budget Banner */}
      <View style={[styles.estimateBanner, isOverBudget && styles.estimateBannerWarning]}>
        <View style={styles.estimateCol}>
          <Text style={styles.estimateLabel}>Estimated Bill</Text>
          <Text style={[styles.estimateAmount, isOverBudget && { color: BrandColors.accentRed }]}>
            £{totalCalculated.toFixed(2)}
          </Text>
        </View>

        <View style={styles.budgetCol}>
          <Text style={styles.budgetLabel}>Target Budget</Text>
          <Text style={styles.budgetAmount}>£{budget.toFixed(2)}</Text>
          <Text style={[styles.budgetStatus, { color: isOverBudget ? BrandColors.accentRed : '#2E7D32' }]}>
            {isOverBudget ? `Over by £${(totalCalculated - budget).toFixed(2)}` : `Under by £${(budget - totalCalculated).toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* AI Smart Swaps / Budget Savings Recommendations */}
      {alternatives.length > 0 && !loading && (
        <View style={styles.savingsCard}>
          <View style={styles.savingsHeader}>
            <View style={styles.savingsBadge}>
              <Ionicons name="sparkles" size={13} color="#047857" />
              <Text style={styles.savingsBadgeText}>AI Smart Swaps</Text>
            </View>
            <Text style={styles.savingsPotential}>Save up to £{Number(savings).toFixed(2)}</Text>
          </View>
          <Text style={styles.savingsSub}>
            Cheaper value alternatives found for items in your basket:
          </Text>
          {alternatives.slice(0, 2).map((alt, index) => {
            const isSwapping = swappingId === alt.originalProductId;
            return (
              <View key={`${alt.suggestedProductId}-${index}`} style={styles.swapRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.swapTitle} numberOfLines={1}>
                    {alt.suggestedProductName}
                  </Text>
                  <Text style={styles.swapReason}>
                    £{Number(alt.suggestedPrice).toFixed(2)} vs £{Number(alt.originalPrice).toFixed(2)} (Save £{Number(alt.estimatedSavings).toFixed(2)})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.swapBtn, isSwapping && { opacity: 0.6 }]}
                  disabled={isSwapping}
                  onPress={() => handleSwapItem(alt)}>
                  {isSwapping ? (
                    <ActivityIndicator size="small" color="#047857" />
                  ) : (
                    <Text style={styles.swapBtnText}>Swap</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Main List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Loading your grocery list...</Text>
        </View>
      ) : !activeList || items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Your Shopping List is Empty</Text>
          <Text style={styles.emptySub}>
            Browse the catalogue to add products and get instant ML bill estimates.
          </Text>

          {showCreateModal ? (
            <View style={styles.createCard}>
              <TextInput
                style={styles.nameInput}
                placeholder="List name (e.g. Monthly Staples)"
                value={newListName}
                onChangeText={setNewListName}
              />
              <TouchableOpacity style={styles.confirmCreateBtn} onPress={handleCreateList}>
                <Text style={styles.confirmCreateBtnText}>Create List</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createListBtn}
              onPress={() => setShowCreateModal(true)}>
              <Text style={styles.createListBtnText}>+ Create New List</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : `item-${index}`)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const unitPrice = Number(item.product?.defaultUnitPrice) || 0;
            const quantity = Number(item.quantity) || 1;
            const lineTotal = unitPrice * quantity;
            return (
              <View style={[styles.itemCard, item.isPurchased && styles.itemCardPurchased]}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => handleTogglePurchased(item)}>
                  <Ionicons
                    name={item.isPurchased ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.isPurchased ? BrandColors.primaryDark : '#9CA3AF'}
                  />
                </TouchableOpacity>

                {/* Product Thumbnail */}
                <View style={styles.itemImgWrapper}>
                  {item.product?.imageUrl ? (
                    <Image
                      source={{ uri: item.product.imageUrl }}
                      style={styles.itemImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="basket" size={20} color={BrandColors.primary} />
                  )}
                </View>

                <View style={styles.itemDetails}>
                  <Text
                    style={[styles.itemName, item.isPurchased && styles.itemNamePurchased]}
                    numberOfLines={1}>
                    {item.product?.name || 'Grocery Item'}
                  </Text>
                  <Text style={styles.itemSub}>
                    £{unitPrice.toFixed(2)} • {item.product?.unit || 'unit'}
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateQuantity(item, -1)}>
                    <Ionicons name="remove" size={14} color={BrandColors.dark} />
                  </TouchableOpacity>
                  <Text style={styles.stepperQty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateQuantity(item, 1)}>
                    <Ionicons name="add" size={14} color={BrandColors.dark} />
                  </TouchableOpacity>
                </View>

                {/* Line Total */}
                <Text style={styles.lineTotal}>£{lineTotal.toFixed(2)}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Floating Checkout / Complete Trip Bar */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomBarTotalLabel}>Total Est. Bill</Text>
            <Text style={styles.bottomBarTotalAmount}>£{totalCalculated.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.completeBtn}
            disabled={completing}
            onPress={handleCompleteTrip}>
            {completing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.completeBtnText}>Complete Trip</Text>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  estimateBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  estimateBannerWarning: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FCA5A5',
  },
  estimateCol: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#6B7280',
    fontWeight: '700',
  },
  estimateAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  budgetCol: {
    alignItems: 'flex-end',
  },
  budgetLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  budgetStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  listContent: {
    padding: 14,
    paddingBottom: 90,
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  itemCardPurchased: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  checkboxTouch: {
    padding: 2,
  },
  itemImgWrapper: {
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
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    color: '#1F2937',
  },
  lineTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    minWidth: 45,
    textAlign: 'right',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  createListBtn: {
    marginTop: 20,
    backgroundColor: '#84C225',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createListBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  createCard: {
    marginTop: 16,
    width: '100%',
    gap: 8,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  confirmCreateBtn: {
    backgroundColor: '#84C225',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarTotalLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  bottomBarTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#84C225',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  savingsCard: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  savingsPotential: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  savingsSub: {
    fontSize: 11,
    color: '#065F46',
    marginBottom: 10,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  swapTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  swapReason: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
    fontWeight: '600',
  },
  swapBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
});
