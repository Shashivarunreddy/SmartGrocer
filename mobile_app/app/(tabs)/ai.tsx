import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import {
  api,
  RecipeItem,
  ReceiptScanResult,
  ReplenishmentItem,
  WasteRiskItem,
} from '@/services/api';

type TabMode = 'recipes' | 'scanner' | 'insights';

export default function AIScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>('recipes');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data States
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [recipesSource, setRecipesSource] = useState<string>('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Scanner States
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  // Insights States
  const [replenishments, setReplenishments] = useState<ReplenishmentItem[]>([]);
  const [wasteRisks, setWasteRisks] = useState<WasteRiskItem[]>([]);

  // Action status toast
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipeRes, repRes, wasteRes] = await Promise.allSettled([
        api.getRecipes(),
        api.getReplenishments(),
        api.getWasteRisks(),
      ]);

      if (recipeRes.status === 'fulfilled') {
        setRecipes(recipeRes.value.data.recipes);
        setRecipesSource(recipeRes.value.data.source);
      }
      if (repRes.status === 'fulfilled') {
        setReplenishments(repRes.value.data.replenishments);
      }
      if (wasteRes.status === 'fulfilled') {
        setWasteRisks(wasteRes.value.data.atRiskItems);
      }
    } catch (err: any) {
      console.warn('AI screen load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ----------------------------------------------------
  // RECIPES LOGIC: Add Missing Ingredients to Active List
  // ----------------------------------------------------
  const handleAddMissingToList = async (recipe: RecipeItem) => {
    try {
      const listsRes = await api.getShoppingLists();
      let targetList = listsRes.data[0];

      if (!targetList) {
        const createRes = await api.createShoppingList('My Smart List', 50, 'GBP');
        targetList = createRes.data;
      }

      let addedCount = 0;
      for (const item of recipe.missingIngredients) {
        if (item.matchedProductId) {
          await api.addItemToList(targetList.id, item.matchedProductId, 1, `For: ${recipe.title}`);
          addedCount++;
        }
      }

      showToast(`✓ Added ${addedCount || recipe.missingIngredients.length} item(s) to "${targetList.name}"!`);
    } catch (err: any) {
      Alert.alert('Error', 'Could not add items to your shopping list: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // RECEIPT SCANNER LOGIC
  // ----------------------------------------------------
  const handleSimulateScan = async (store: 'tesco' | 'sainsburys') => {
    try {
      setScanning(true);
      // Calls Gemini vision endpoint (with simulated base64 in demo)
      const res = await api.scanReceipt(
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        'image/jpeg'
      );
      setScanResult(res.data);
      showToast(`✓ Parsed receipt from ${res.data.storeName}!`);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveReceiptToPantry = async () => {
    if (!scanResult) return;
    try {
      let saved = 0;
      for (const item of scanResult.items) {
        if (item.matchedProductId) {
          await api.addPantryItem(item.matchedProductId, item.quantity, 'unit');
          saved++;
        }
      }
      showToast(`✓ Transferred ${saved} item(s) to your active pantry!`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddReceiptToList = async () => {
    if (!scanResult) return;
    try {
      const listsRes = await api.getShoppingLists();
      let targetList = listsRes.data[0];
      if (!targetList) {
        const createRes = await api.createShoppingList('Receipt Restock', 40, 'GBP');
        targetList = createRes.data;
      }

      let added = 0;
      for (const item of scanResult.items) {
        if (item.matchedProductId) {
          await api.addItemToList(targetList.id, item.matchedProductId, item.quantity);
          added++;
        }
      }
      showToast(`✓ Added ${added} item(s) to "${targetList.name}"!`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ----------------------------------------------------
  // REPLENISHMENT ACTION
  // ----------------------------------------------------
  const handleAddReplenishmentToList = async (item: ReplenishmentItem) => {
    try {
      const listsRes = await api.getShoppingLists();
      let targetList = listsRes.data[0];
      if (!targetList) {
        const createRes = await api.createShoppingList('Weekly Restock', 40, 'GBP');
        targetList = createRes.data;
      }

      await api.addItemToList(targetList.id, item.productId, item.suggestedQuantity, 'AI Replenishment');
      showToast(`✓ Added ${item.productName} to "${targetList.name}"!`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Banner */}
      {actionFeedback && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{actionFeedback}</Text>
        </View>
      )}

      {/* Segmented Tab Header */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'recipes' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('recipes')}>
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={activeTab === 'recipes' ? '#FFF' : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'recipes' && styles.segmentTextActive]}>
            Chef Recipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'scanner' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('scanner')}>
          <Ionicons
            name="scan-outline"
            size={16}
            color={activeTab === 'scanner' ? '#FFF' : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'scanner' && styles.segmentTextActive]}>
            Receipt OCR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'insights' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('insights')}>
          <Ionicons
            name="trending-up-outline"
            size={16}
            color={activeTab === 'insights' ? '#FFF' : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'insights' && styles.segmentTextActive]}>
            Smart Insights
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Connecting to SmartGrocer AI...</Text>
          </View>
        ) : (
          <>
            {/* ======================================================== */}
            {/* VIEW 1: ZERO-WASTE CHEF RECIPES                         */}
            {/* ======================================================== */}
            {activeTab === 'recipes' && (
              <View>
                <View style={styles.heroCard}>
                  <View style={styles.heroIconBox}>
                    <Ionicons name="sparkles" size={24} color="#FFF" />
                  </View>
                  <View style={styles.heroTextBox}>
                    <Text style={styles.heroTitle}>Zero-Waste Chef</Text>
                    <Text style={styles.heroSubtitle}>
                      {recipesSource === 'GEMINI_AI'
                        ? '⚡ Powered by Google Gemini AI · Optimized for your pantry'
                        : '🌿 Curated British Kitchen · Prioritizing expiring stock'}
                    </Text>
                  </View>
                </View>

                {recipes.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="nutrition-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Pantry Items Found</Text>
                    <Text style={styles.emptySub}>
                      Add groceries to your pantry to receive personalized zero-waste recipes!
                    </Text>
                  </View>
                ) : (
                  recipes.map((recipe) => {
                    const isExpanded = expandedRecipeId === recipe.id;
                    return (
                      <View key={recipe.id} style={styles.recipeCard}>
                        {/* Recipe Header */}
                        <View style={styles.recipeCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recipeTitle}>{recipe.title}</Text>
                            <Text style={styles.recipeDesc}>{recipe.description}</Text>
                          </View>
                          <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>{recipe.wasteReductionScore}%</Text>
                            <Text style={styles.scoreLabel}>Save</Text>
                          </View>
                        </View>

                        {/* Meta Tags */}
                        <View style={styles.metaRow}>
                          <View style={styles.metaPill}>
                            <Ionicons name="time-outline" size={14} color="#4B5563" />
                            <Text style={styles.metaPillText}>{recipe.prepTimeMinutes} mins</Text>
                          </View>
                          <View style={styles.metaPill}>
                            <Ionicons name="bar-chart-outline" size={14} color="#4B5563" />
                            <Text style={styles.metaPillText}>{recipe.difficulty}</Text>
                          </View>
                          <View style={styles.metaPill}>
                            <Ionicons name="people-outline" size={14} color="#4B5563" />
                            <Text style={styles.metaPillText}>{recipe.servings} Servings</Text>
                          </View>
                        </View>

                        {/* Pantry Ingredients Used */}
                        <View style={styles.sectionBlock}>
                          <Text style={styles.sectionHeader}>In Your Pantry:</Text>
                          <View style={styles.tagsWrap}>
                            {recipe.usedPantryItems.map((ing, idx) => (
                              <View key={idx} style={styles.pantryTag}>
                                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                <Text style={styles.pantryTagText}>
                                  {ing.name} ({ing.quantity})
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Missing Ingredients & One-Tap Add */}
                        {recipe.missingIngredients.length > 0 && (
                          <View style={styles.sectionBlock}>
                            <View style={styles.missingHeaderRow}>
                              <Text style={styles.sectionHeader}>Missing Groceries:</Text>
                              <Text style={styles.missingPriceSummary}>
                                ~£
                                {recipe.missingIngredients
                                  .reduce((acc, m) => acc + (m.estimatedPriceGbp || 1.5), 0)
                                  .toFixed(2)}
                              </Text>
                            </View>

                            <View style={styles.tagsWrap}>
                              {recipe.missingIngredients.map((m, idx) => (
                                <View key={idx} style={styles.missingTag}>
                                  <Ionicons name="add-circle-outline" size={14} color="#D97706" />
                                  <Text style={styles.missingTagText}>
                                    {m.name} (~£{Number(m.estimatedPriceGbp || 1.5).toFixed(2)})
                                  </Text>
                                </View>
                              ))}
                            </View>

                            <TouchableOpacity
                              style={styles.btnAddMissing}
                              onPress={() => handleAddMissingToList(recipe)}>
                              <Ionicons name="cart-outline" size={16} color="#FFF" />
                              <Text style={styles.btnAddMissingText}>
                                Add Missing Ingredients to Shopping List
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Instructions Toggle */}
                        <TouchableOpacity
                          style={styles.btnToggleInstructions}
                          onPress={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}>
                          <Text style={styles.btnToggleText}>
                            {isExpanded ? 'Hide Cooking Instructions ▲' : 'View Cooking Steps ▼'}
                          </Text>
                        </TouchableOpacity>

                        {/* Expanded Step-by-Step Instructions */}
                        {isExpanded && (
                          <View style={styles.instructionsContainer}>
                            {recipe.instructions.map((step, idx) => (
                              <View key={idx} style={styles.stepRow}>
                                <View style={styles.stepNumberBadge}>
                                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                                </View>
                                <Text style={styles.stepText}>{step}</Text>
                              </View>
                            ))}

                            {recipe.chefTip && (
                              <View style={styles.tipCard}>
                                <Ionicons name="bulb-outline" size={18} color="#B45309" />
                                <Text style={styles.tipText}>
                                  <Text style={{ fontWeight: '700' }}>Chef Tip: </Text>
                                  {recipe.chefTip}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: SMART RECEIPT SCANNER                           */}
            {/* ======================================================== */}
            {activeTab === 'scanner' && (
              <View>
                <View style={styles.heroCard}>
                  <View style={[styles.heroIconBox, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
                  </View>
                  <View style={styles.heroTextBox}>
                    <Text style={styles.heroTitle}>Supermarket Receipt Scanner</Text>
                    <Text style={styles.heroSubtitle}>
                      Powered by Gemini Multimodal Vision · Auto-matches 525 UK Items
                    </Text>
                  </View>
                </View>

                {/* Scan Simulator Card */}
                <View style={styles.scanActionCard}>
                  <Text style={styles.scanPromptText}>
                    Snap or upload a photo of your paper receipt from Tesco, Sainsbury's, or Asda to
                    instantly update your pantry or track actual spending.
                  </Text>

                  {scanning ? (
                    <View style={styles.scanningBox}>
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text style={styles.scanningText}>
                        Gemini Vision is analyzing receipt line items & prices...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnScanRow}>
                      <TouchableOpacity
                        style={[styles.btnScan, { backgroundColor: '#0284C7' }]}
                        onPress={() => handleSimulateScan('tesco')}>
                        <Ionicons name="receipt-outline" size={18} color="#FFF" />
                        <Text style={styles.btnScanText}>Demo Tesco Receipt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnScan, { backgroundColor: '#EA580C' }]}
                        onPress={() => handleSimulateScan('sainsburys')}>
                        <Ionicons name="document-text-outline" size={18} color="#FFF" />
                        <Text style={styles.btnScanText}>Demo Sainsbury's</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Scan Results View */}
                {scanResult && (
                  <View style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <View>
                        <Text style={styles.resultStore}>{scanResult.storeName}</Text>
                        <Text style={styles.resultDate}>Date: {scanResult.transactionDate}</Text>
                      </View>
                      <View style={styles.resultTotalBox}>
                        <Text style={styles.resultTotalLabel}>Total</Text>
                        <Text style={styles.resultTotalVal}>
                          £{Number(scanResult.totalGbp).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.matchedBanner}>
                      ✓ {scanResult.matchedCatalogueCount} of {scanResult.items.length} items
                      matched to UK Database
                    </Text>

                    {/* Extracted Items List */}
                    {scanResult.items.map((item, idx) => (
                      <View key={idx} style={styles.extractedItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRawText}>{item.rawName}</Text>
                          {item.matchedProductName && (
                            <Text style={styles.itemMatchedText}>
                              ↳ Matched: {item.matchedProductName}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.itemPriceText}>
                            £{Number(item.totalPriceGbp).toFixed(2)}
                          </Text>
                          <Text style={styles.itemQtyText}>Qty: {item.quantity}</Text>
                        </View>
                      </View>
                    ))}

                    {/* Batch Actions */}
                    <View style={styles.batchActionsRow}>
                      <TouchableOpacity
                        style={[styles.btnBatch, { backgroundColor: '#059669' }]}
                        onPress={handleSaveReceiptToPantry}>
                        <Ionicons name="nutrition" size={16} color="#FFF" />
                        <Text style={styles.btnBatchText}>Add All to Pantry</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnBatch, { backgroundColor: BrandColors.dark }]}
                        onPress={handleAddReceiptToList}>
                        <Ionicons name="list" size={16} color="#FFF" />
                        <Text style={styles.btnBatchText}>Add to Shopping List</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: SMART REPLENISHMENT & WASTE INSIGHTS             */}
            {/* ======================================================== */}
            {activeTab === 'insights' && (
              <View>
                <View style={styles.heroCard}>
                  <View style={[styles.heroIconBox, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="analytics-outline" size={24} color="#FFF" />
                  </View>
                  <View style={styles.heroTextBox}>
                    <Text style={styles.heroTitle}>Household Intelligence</Text>
                    <Text style={styles.heroSubtitle}>
                      Replenishment forecasting & spoilage risk detection
                    </Text>
                  </View>
                </View>

                {/* Section A: Food Waste Risk Alerts */}
                <Text style={styles.groupHeading}>⚠️ Food Spoilage Risk Alerts</Text>
                {wasteRisks.length === 0 ? (
                  <View style={styles.safeCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#059669" />
                    <Text style={styles.safeText}>
                      No immediate spoilage risks detected. Your pantry is well-balanced!
                    </Text>
                  </View>
                ) : (
                  wasteRisks.map((item, idx) => (
                    <View key={idx} style={styles.riskCard}>
                      <View style={styles.riskHeader}>
                        <Text style={styles.riskTitle}>{item.productName}</Text>
                        <View
                          style={[
                            styles.urgencyPill,
                            {
                              backgroundColor:
                                item.riskLevel === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                            },
                          ]}>
                          <Text
                            style={[
                              styles.urgencyText,
                              {
                                color: item.riskLevel === 'CRITICAL' ? '#B91C1C' : '#B45309',
                              },
                            ]}>
                            {item.riskLevel}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.riskSub}>
                        Stock: {item.quantity} {item.unit} · Expires in {item.daysUntilExpiry} days
                      </Text>
                      <Text style={styles.riskAction}>💡 {item.suggestedAction}</Text>
                    </View>
                  ))
                )}

                {/* Section B: Predicted Replenishments */}
                <Text style={[styles.groupHeading, { marginTop: 24 }]}>
                  🛒 Predicted Restock Items
                </Text>
                {replenishments.length === 0 ? (
                  <View style={styles.safeCard}>
                    <Ionicons name="checkmark-done" size={24} color="#059669" />
                    <Text style={styles.safeText}>
                      All essential staples are currently stocked. Next forecast runs tomorrow.
                    </Text>
                  </View>
                ) : (
                  replenishments.map((rep, idx) => (
                    <View key={idx} style={styles.repCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.repTitle}>{rep.productName}</Text>
                        <Text style={styles.repReason}>{rep.reason}</Text>
                        <Text style={styles.repMeta}>
                          Suggested: {rep.suggestedQuantity} {rep.unit} · Depletes in ~
                          {rep.estimatedDaysUntilDepleted}d
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.btnRepAdd}
                        onPress={() => handleAddReplenishmentToList(rep)}>
                        <Ionicons name="add" size={18} color="#FFF" />
                        <Text style={styles.btnRepAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    marginHorizontal: 3,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.dark,
    lineHeight: 22,
  },
  recipeDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: 18,
  },
  scoreBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 4,
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pantryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  pantryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    marginLeft: 4,
  },
  missingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missingPriceSummary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  missingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  missingTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    marginLeft: 4,
  },
  btnAddMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
  },
  btnAddMissingText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  btnToggleInstructions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  btnToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  instructionsContainer: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 17,
  },

  // Scanner Styles
  scanActionCard: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scanPromptText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 16,
  },
  scanningBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  scanningText: {
    marginTop: 10,
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnScanRow: {
    flexDirection: 'row',
  },
  btnScan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  btnScanText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  resultCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultStore: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.dark,
  },
  resultDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  resultTotalBox: {
    alignItems: 'flex-end',
  },
  resultTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  resultTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  matchedBanner: {
    backgroundColor: '#F0FDF4',
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 12,
  },
  extractedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  itemRawText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemMatchedText: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  itemQtyText: {
    fontSize: 11,
    color: '#6B7280',
  },
  batchActionsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  btnBatch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  btnBatchText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Insights Styles
  groupHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    borderRadius: 10,
  },
  safeText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    marginLeft: 10,
    lineHeight: 18,
  },
  riskCard: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '800',
  },
  riskSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  riskAction: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 6,
    fontWeight: '500',
  },
  repCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  repTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  repReason: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  repMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  btnRepAdd: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  btnRepAddText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
});
