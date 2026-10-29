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
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import {
  api,
  ShoppingList,
  ListItem,
  BillEstimate,
  AlternativeItem,
  ShoppingTripRecord,
} from '@/services/api';

type TabView = 'current' | 'history';

export default function ListsScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<TabView>('current');

  // List States
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [estimate, setEstimate] = useState<BillEstimate | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [savings, setSavings] = useState(0);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Checkout Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('Weekly grocery shop');
  const [autoTransferPantry, setAutoTransferPantry] = useState(true);

  // Shopping Trips History States
  const [trips, setTrips] = useState<ShoppingTripRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const fetchTripsHistory = async () => {
    if (!isSignedIn) return;
    try {
      setLoadingTrips(true);
      const res = await api.getShoppingTrips();
      setTrips(res.data || []);
    } catch (err: any) {
      console.log('Error fetching trips history:', err.message);
    } finally {
      setLoadingTrips(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActiveList();
      if (activeTab === 'history') {
        fetchTripsHistory();
      }
    }, [activeTab])
  );

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    if (tab === 'history') {
      fetchTripsHistory();
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await api.createShoppingList(newListName.trim(), 75, 'GBP');
      setActiveList(res.data);
      setShowCreateModal(false);
      setNewListName('');
      fetchActiveList();
      showToast('✓ New list created!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleUpdateQuantity = async (item: ListItem, delta: number) => {
    if (!activeList) return;
    const currentQty = Math.round(Number(item.quantity) || 1);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      await api.deleteListItem(activeList.id, item.id);
      showToast(`Removed ${item.product?.name || 'item'}`);
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

      await api.addItemToList(activeList.id, alt.suggestedProductId, qty);
      if (originalItem) {
        await api.deleteListItem(activeList.id, originalItem.id);
      }
      showToast(`✓ Swapped to ${alt.suggestedProductName} (Saved £${alt.estimatedSavings.toFixed(2)})`);
      fetchActiveList();
    } catch (err: any) {
      fetchActiveList();
    } finally {
      setSwappingId(null);
    }
  };

  // ---------------------------------------------------------------------
  // SUPERMARKET CHECKOUT COMPLETION & PANTRY TRANSFER (Phase A)
  // ---------------------------------------------------------------------
  const handleConfirmCheckout = async () => {
    if (!activeList || !activeList.items || activeList.items.length === 0) {
      Alert.alert('Empty List', 'Please add products before checking out.');
      return;
    }

    try {
      setCompleting(true);
      const itemsToSave = activeList.items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.product?.defaultUnitPrice) || 1.5,
      }));

      await api.recordShoppingTrip({
        shoppingListId: activeList.id,
        updatePantry: autoTransferPantry,
        items: itemsToSave,
        notes: checkoutNotes.trim() || 'Supermarket checkout',
      });

      setShowCheckoutModal(false);
      showToast('🎉 Shopping trip completed! Items restocked in Pantry.');
      Alert.alert(
        'Checkout Complete! 🎉',
        autoTransferPantry
          ? 'Your shopping trip has been recorded. All groceries have been transferred to your Pantry with automatic use-by shelf life dates!'
          : 'Your shopping trip has been saved to your Trip History.'
      );

      // Refresh list and history
      fetchActiveList();
      fetchTripsHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record shopping trip.');
    } finally {
      setCompleting(false);
    }
  };

  // ---------------------------------------------------------------------
  // RE-ADD ALL TRIP ITEMS TO A NEW SHOPPING LIST
  // ---------------------------------------------------------------------
  const handleReAddTripToList = async (trip: ShoppingTripRecord) => {
    try {
      const res = await api.createShoppingList(
        `Restock from ${new Date(trip.purchasedAt).toLocaleDateString('en-GB')}`,
        Number(trip.actualTotal) + 15,
        trip.currency || 'GBP'
      );
      const newList = res.data;

      let added = 0;
      for (const item of trip.items) {
        if (item.productId) {
          await api.addItemToList(newList.id, item.productId, Number(item.quantity) || 1);
          added++;
        }
      }

      showToast(`✓ Created new list with ${added} items from past trip!`);
      setActiveTab('current');
      fetchActiveList();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Calculations
  const items = activeList?.items || [];
  const totalCalculated = items.reduce(
    (sum, i) => sum + (Number(i.product?.defaultUnitPrice) || 0) * (Number(i.quantity) || 1),
    0
  );
  const budget = Number(activeList?.budget) || 75;
  const isOverBudget = totalCalculated > budget;
  const checkedItemsCount = items.filter((i) => i.isPurchased).length;

  return (
    <View style={styles.container}>
      {/* Toast Feedback */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Segmented Header Switcher */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'current' && styles.segmentBtnActive]}
          onPress={() => handleTabChange('current')}>
          <Ionicons
            name="cart-outline"
            size={16}
            color={activeTab === 'current' ? '#FFF' : '#4B5563'}
          />
          <Text style={[styles.segmentText, activeTab === 'current' && styles.segmentTextActive]}>
            Active List ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
          onPress={() => handleTabChange('history')}>
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === 'history' ? '#FFF' : '#4B5563'}
          />
          <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>
            Trip History ({trips.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* TAB 1: ACTIVE SHOPPING LIST                             */}
      {/* ======================================================== */}
      {activeTab === 'current' && (
        <View style={{ flex: 1 }}>
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
              <Text style={styles.checkedCountText}>
                {checkedItemsCount} of {items.length} in cart
              </Text>
            </View>

            <View style={styles.budgetCol}>
              <Text style={styles.budgetLabel}>Target Budget</Text>
              <Text style={styles.budgetAmount}>£{budget.toFixed(2)}</Text>
              <Text style={[styles.budgetStatus, { color: isOverBudget ? BrandColors.accentRed : '#059669' }]}>
                {isOverBudget
                  ? `Over by £${(totalCalculated - budget).toFixed(2)}`
                  : `Under by £${(budget - totalCalculated).toFixed(2)}`}
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
              <Text style={styles.savingsSub}>Cheaper value alternatives found for items in your basket:</Text>
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
                <TouchableOpacity style={styles.createListBtn} onPress={() => setShowCreateModal(true)}>
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
                const product = item.product;
                const unitPrice = Number(product?.defaultUnitPrice) || 0;
                const itemQuantity = Number(item.quantity) || 1;
                const lineTotal = unitPrice * itemQuantity;

                return (
                  <View style={[styles.itemCard, item.isPurchased && styles.itemCardPurchased]}>
                    <TouchableOpacity
                      style={styles.checkTouch}
                      onPress={() => handleTogglePurchased(item)}>
                      <Ionicons
                        name={item.isPurchased ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={item.isPurchased ? BrandColors.primary : '#9CA3AF'}
                      />
                    </TouchableOpacity>

                    <Image
                      source={{
                        uri: product?.imageUrl || 'https://placehold.co/40x40/111/444?text=-',
                      }}
                      style={styles.prodThumb}
                    />

                    <View style={styles.itemDetails}>
                      <Text
                        style={[styles.itemName, item.isPurchased && styles.itemNamePurchased]}
                        numberOfLines={1}>
                        {product?.name || 'Item'}
                      </Text>
                      <Text style={styles.itemBrand}>
                        {product?.brands || 'UK Groceries'} · £{unitPrice.toFixed(2)}
                      </Text>
                      <Text style={styles.itemLineTotal}>
                        Total: £{lineTotal.toFixed(2)}
                      </Text>
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleUpdateQuantity(item, -1)}>
                        <Ionicons name="remove" size={16} color={BrandColors.dark} />
                      </TouchableOpacity>

                      <Text style={styles.qtyNumber}>{itemQuantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleUpdateQuantity(item, 1)}>
                        <Ionicons name="add" size={16} color={BrandColors.dark} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Floating Checkout Footer Button */}
          {items.length > 0 && (
            <View style={styles.footerCheckoutBar}>
              <TouchableOpacity
                style={styles.btnCheckoutMain}
                onPress={() => setShowCheckoutModal(true)}>
                <Ionicons name="bag-check-outline" size={20} color="#FFF" />
                <Text style={styles.btnCheckoutMainText}>
                  Complete Shopping Trip · £{totalCalculated.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SHOPPING TRIPS HISTORY (Phase A)                  */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {loadingTrips ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Loading past shopping trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Past Shopping Trips Yet</Text>
              <Text style={styles.emptySub}>
                When you finish an in-store shop and tap "Complete Shopping Trip", your itemized receipts will be saved here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(trip) => trip.id}
              contentContainerStyle={styles.historyListContent}
              renderItem={({ item: trip }) => {
                const isExpanded = expandedTripId === trip.id;
                const formattedDate = new Date(trip.purchasedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripStoreTitle}>{trip.notes || 'Supermarket Shop'}</Text>
                        <Text style={styles.tripDateText}>📅 {formattedDate}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.tripTotalText}>
                          £{Number(trip.actualTotal).toFixed(2)}
                        </Text>
                        <Text style={styles.tripItemCount}>
                          {trip.items?.length || 0} items
                        </Text>
                      </View>
                    </View>

                    {/* Expand/Collapse Toggle */}
                    <TouchableOpacity
                      style={styles.tripToggleBtn}
                      onPress={() => setExpandedTripId(isExpanded ? null : trip.id)}>
                      <Text style={styles.tripToggleBtnText}>
                        {isExpanded ? 'Hide Itemized Receipt ▲' : 'View Itemized Receipt ▼'}
                      </Text>
                    </TouchableOpacity>

                    {/* Itemized Receipt Breakdown */}
                    {isExpanded && (
                      <View style={styles.itemizedReceiptBox}>
                        {trip.items.map((tItem, idx) => (
                          <View key={idx} style={styles.receiptLineRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.receiptProdName} numberOfLines={1}>
                                {tItem.product?.name || 'Grocery Item'}
                              </Text>
                              <Text style={styles.receiptProdMeta}>
                                {tItem.quantity}x @ £{Number(tItem.unitPrice).toFixed(2)}
                              </Text>
                            </View>
                            <Text style={styles.receiptLineTotal}>
                              £{Number(tItem.lineTotal).toFixed(2)}
                            </Text>
                          </View>
                        ))}

                        {/* Re-add to List Action */}
                        <TouchableOpacity
                          style={styles.btnReAdd}
                          onPress={() => handleReAddTripToList(trip)}>
                          <Ionicons name="refresh-outline" size={16} color="#FFF" />
                          <Text style={styles.btnReAddText}>
                            Re-Add All Items to New Shopping List
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* CHECKOUT REVIEW MODAL (Phase A)                          */}
      {/* ======================================================== */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Supermarket Checkout</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalSubtitle}>
                Review your purchases before finalizing. Items will be archived to History and automatically restocked into your Pantry.
              </Text>

              {/* Spend vs Budget Summary Card */}
              <View style={styles.modalSummaryCard}>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Actual Spending</Text>
                  <Text style={styles.modalSummaryVal}>£{totalCalculated.toFixed(2)}</Text>
                </View>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Target Budget</Text>
                  <Text style={styles.modalSummaryVal}>£{budget.toFixed(2)}</Text>
                </View>
                <View style={[styles.modalSummaryRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.modalSummaryLabel, { fontWeight: '700' }]}>Variance</Text>
                  <Text style={[styles.modalSummaryVal, { color: isOverBudget ? BrandColors.accentRed : '#059669', fontWeight: '800' }]}>
                    {isOverBudget ? `Over by £${(totalCalculated - budget).toFixed(2)}` : `Under budget by £${(budget - totalCalculated).toFixed(2)} 🎉`}
                  </Text>
                </View>
              </View>

              {/* Items Snapshot */}
              <Text style={styles.inputSectionLabel}>Purchased Items ({items.length})</Text>
              <View style={styles.checkoutItemsBox}>
                {items.map((it, idx) => (
                  <View key={idx} style={styles.checkoutItemLine}>
                    <Text style={styles.checkoutItemName} numberOfLines={1}>
                      {it.quantity}x {it.product?.name}
                    </Text>
                    <Text style={styles.checkoutItemPrice}>
                      £{((Number(it.product?.defaultUnitPrice) || 0) * (Number(it.quantity) || 1)).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Store Notes */}
              <Text style={styles.inputSectionLabel}>Trip Notes / Supermarket</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Tesco Superstore, Sainsbury's Local"
                value={checkoutNotes}
                onChangeText={setCheckoutNotes}
              />

              {/* Auto Transfer Pantry Switch */}
              <TouchableOpacity
                style={styles.autoPantryToggle}
                onPress={() => setAutoTransferPantry(!autoTransferPantry)}>
                <Ionicons
                  name={autoTransferPantry ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={autoTransferPantry ? BrandColors.primary : '#9CA3AF'}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.autoPantryTitle}>
                    Auto-transfer groceries to Pantry
                  </Text>
                  <Text style={styles.autoPantrySub}>
                    Calculates estimated shelf life and use-by dates automatically based on category.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Confirm Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setShowCheckoutModal(false)}>
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalConfirm, completing && { opacity: 0.6 }]}
                disabled={completing}
                onPress={handleConfirmCheckout}>
                {completing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnModalConfirmText}>Confirm & Finish Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  toastBanner: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F3F4F6',
  },
  segmentBtnActive: {
    backgroundColor: BrandColors.dark,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#FFF',
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  authBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 8,
  },
  authBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginLeft: 8,
    marginTop: 2,
  },
  authBannerBtn: {
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  authBannerBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  estimateBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  estimateBannerWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  estimateCol: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  estimateAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.dark,
    marginTop: 2,
  },
  checkedCountText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  budgetCol: {
    alignItems: 'flex-end',
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
  },
  budgetStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  savingsCard: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 4,
  },
  savingsPotential: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  savingsSub: {
    fontSize: 12,
    color: '#065F46',
    marginBottom: 8,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  swapTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  swapReason: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  swapBtn: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  swapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardPurchased: {
    opacity: 0.65,
    backgroundColor: '#F9FAFB',
  },
  checkTouch: {
    marginRight: 10,
  },
  prodThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.dark,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemBrand: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemLineTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.dark,
    paddingHorizontal: 6,
  },
  footerCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  btnCheckoutMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnCheckoutMainText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.dark,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  createCard: {
    width: '100%',
    marginTop: 20,
  },
  nameInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  confirmCreateBtn: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCreateBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  createListBtn: {
    backgroundColor: BrandColors.dark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  createListBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // History Tab Styles
  historyListContent: {
    padding: 12,
    paddingBottom: 40,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripStoreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.dark,
  },
  tripDateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tripTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  tripItemCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tripToggleBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  tripToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  itemizedReceiptBox: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  receiptLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  receiptProdName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  receiptProdMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  receiptLineTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  btnReAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.dark,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 10,
  },
  btnReAddText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.dark,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalSummaryCard: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalSummaryLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  modalSummaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  checkoutItemsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    maxHeight: 120,
  },
  checkoutItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  checkoutItemName: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    marginRight: 10,
  },
  checkoutItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  modalTextInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  autoPantryToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  autoPantryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  autoPantrySub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  btnModalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  btnModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  btnModalConfirm: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  btnModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
