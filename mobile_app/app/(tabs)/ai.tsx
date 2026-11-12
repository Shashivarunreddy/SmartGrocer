import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import {
  api,
  RecipeItem,
  ReplenishmentItem,
  WasteRiskItem,
  ChatAssistantResponse,
  GetAllRecipeIngredientsResult,
} from '@/services/api';

type TabMode = 'recipes' | 'assistant' | 'insights';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
  recipe?: RecipeItem;
  followUps?: string[];
}

const MEAL_FILTERS = [
  { key: 'all', label: 'All Dishes' },
  { key: 'pantry', label: 'Pantry Match' },
  { key: 'quick', label: '⚡ Quick' },
  { key: 'dinner', label: '🍽️ Dinner' },
  { key: 'breakfast', label: '🥞 Breakfast' },
  { key: 'vegetarian', label: '🥗 Vegetarian' },
  { key: 'spicy', label: '🌶️ Spicy' },
];

const QUICK_PROMPTS = [
  '🍳 Suggest a dinner dish',
  '🥛 Find fresh milk & dairy',
  '🛒 What do I need to buy?',
  '⏳ What is expiring soon?',
  '💰 How is my grocery budget?',
];

export default function AIScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>('recipes');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data States
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [recipesSource, setRecipesSource] = useState<string>('');
  const [recipesSummary, setRecipesSummary] = useState<string>('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [recipeQuery, setRecipeQuery] = useState<string>('');
  const [recipesLoading, setRecipesLoading] = useState<boolean>(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [getAllResults, setGetAllResults] = useState<Record<string, GetAllRecipeIngredientsResult>>({});

  // Insights States
  const [replenishments, setReplenishments] = useState<ReplenishmentItem[]>([]);
  const [wasteRisks, setWasteRisks] = useState<WasteRiskItem[]>([]);

  // Chat Assistant States
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! 👋 I'm your SmartGrocer Culinary & Pantry AI. Ask me what to cook tonight, search UK groceries, or let me check your pantry & build your shopping list!",
      followUps: ['🍳 Suggest a dinner dish', '🥛 Find fresh milk & dairy'],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAddedMap, setChatAddedMap] = useState<Record<string, boolean>>({});
  const [chatRecipeOutcomes, setChatRecipeOutcomes] = useState<Record<string, GetAllRecipeIngredientsResult>>({});
  const chatScrollRef = useRef<any>(null);

  // Action status toast
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const loadRecipesOnly = async (opts?: { mealType?: string; query?: string; refresh?: boolean }) => {
    try {
      setRecipesLoading(true);
      const res = await api.getRecipes({
        mealType: opts?.mealType ?? mealFilter,
        query: opts?.query ?? recipeQuery,
        refresh: opts?.refresh,
      });
      if (res?.data) {
        setRecipes(res.data.recipes || []);
        setRecipesSource(res.data.source || '');
        setRecipesSummary(res.data.summary || '');
      }
    } catch (err: any) {
      console.warn('Recipe filter error:', err.message);
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipeRes, repRes, wasteRes] = await Promise.allSettled([
        api.getRecipes({ mealType: mealFilter, query: recipeQuery }),
        api.getReplenishments(),
        api.getWasteRisks(),
      ]);

      if (recipeRes.status === 'fulfilled') {
        setRecipes(recipeRes.value.data.recipes);
        setRecipesSource(recipeRes.value.data.source);
        setRecipesSummary(recipeRes.value.data.summary || '');
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
  // RECIPES LOGIC: "Get All" Live Pantry Check & Add
  // ----------------------------------------------------
  const handleGetAllForRecipe = async (recipe: RecipeItem, chatMsgId?: string) => {
    const recipeKey = recipe.id || recipe.title;
    try {
      setAddingRecipeId(recipeKey);
      const pantryItemsList = recipe.usedPantryItems.filter((u) => u.isFromPantry);
      const allRecipeIngredients = [
        ...pantryItemsList.map((u) => ({
          name: u.name,
          quantity: u.quantity,
          suggestedCategory: 'Groceries',
        })),
        ...recipe.missingIngredients.map((m) => ({
          name: m.name,
          quantity: m.quantity,
          suggestedCategory: m.suggestedCategory,
          matchedProductId: m.matchedProductId,
        })),
      ];

      const res = await api.getAllRecipeIngredients({
        recipeTitle: recipe.title,
        ingredients: allRecipeIngredients,
      });
      const result = res.data;

      if (chatMsgId) {
        setChatRecipeOutcomes((prev) => ({ ...prev, [chatMsgId]: result }));
      } else {
        setGetAllResults((prev) => ({ ...prev, [recipeKey]: result }));
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id || r.title === recipe.title
              ? { ...r, missingIngredients: [] }
              : r
          )
        );
      }

      showToast(`✓ ${result.summary}`);
      Alert.alert(
        'Pantry Checked & List Updated! 🛒',
        result.addedItems.length > 0
          ? `${result.summary}\n\nOpen the Shopping Lists tab to buy your items and start cooking "${recipe.title}".`
          : result.summary
      );
    } catch (err: any) {
      Alert.alert('Error', 'Could not check pantry & add items: ' + err.message);
    } finally {
      setAddingRecipeId(null);
    }
  };

  const handleAddSingleMissingToList = async (
    recipe: RecipeItem,
    item: RecipeItem['missingIngredients'][0]
  ) => {
    const recipeKey = recipe.id || recipe.title;
    try {
      const res = await api.getAllRecipeIngredients({
        recipeTitle: recipe.title,
        ingredients: [
          {
            name: item.name,
            quantity: item.quantity,
            suggestedCategory: item.suggestedCategory,
            matchedProductId: item.matchedProductId,
          },
        ],
      });
      const result = res.data;
      showToast(
        result.addedItems.length > 0
          ? `✓ Added "${result.addedItems[0].name}" to "${result.listName}"!`
          : `✓ ${result.summary}`
      );

      setRecipes((prev) =>
        prev.map((r) => {
          if (r.id === recipe.id || r.title === recipe.title) {
            const updatedMissing = r.missingIngredients.filter((m) => m.name !== item.name);
            if (updatedMissing.length === 0) {
              setGetAllResults((p) => ({ ...p, [recipeKey]: result }));
            }
            return { ...r, missingIngredients: updatedMissing };
          }
          return r;
        })
      );
    } catch (err: any) {
      Alert.alert('Error', 'Could not add item to your shopping list: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // CHAT ASSISTANT LOGIC (Multi-Turn History)
  // ----------------------------------------------------
  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setChatLoading(true);

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const recentHistory = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.chatWithAssistant(query, recentHistory);
      const data: ChatAssistantResponse = res.data;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        products: data.suggestedProducts,
        recipe: data.suggestedRecipe,
        followUps: data.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Sorry, I couldn't reach the grocery intelligence service: ${err.message || 'Unknown error'}. Please try again!`,
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleAddChatProductToList = async (prod: { id: string; name: string }) => {
    try {
      const listsRes = await api.getShoppingLists();
      const lists = listsRes?.data || [];
      let targetList = lists.find(
        (l: any) => l.status === 'ACTIVE' || l.status === 'DRAFT'
      );

      if (!targetList) {
        const createRes = await api.createShoppingList('My Smart List', 50, 'GBP');
        targetList = createRes.data;
      }

      await api.addItemToList(targetList.id, prod.id, 1, 'Added via AI Chat');
      setChatAddedMap((prev) => ({ ...prev, [prod.id]: true }));
      showToast(`✓ Added ${prod.name} to "${targetList.name}"!`);
    } catch (err: any) {
      Alert.alert('Error', 'Could not add to list: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // REPLENISHMENT ACTION
  // ----------------------------------------------------
  const handleAddReplenishmentToList = async (item: ReplenishmentItem) => {
    try {
      const listsRes = await api.getShoppingLists();
      const lists = listsRes?.data || [];
      let targetList = lists.find(
        (l: any) => l.status === 'ACTIVE' || l.status === 'DRAFT'
      );
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
          style={[styles.segmentBtn, activeTab === 'assistant' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('assistant')}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={activeTab === 'assistant' ? '#FFF' : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'assistant' && styles.segmentTextActive]}>
            AI Chatbot
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

      {/* Main Content */}
      {activeTab === 'assistant' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={chatScrollRef}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.chatMsgRow,
                  m.role === 'user' ? styles.chatMsgRowUser : styles.chatMsgRowAi,
                ]}>
                {m.role === 'assistant' && (
                  <View style={styles.chatBotAvatar}>
                    <Ionicons name="sparkles" size={13} color="#FFF" />
                  </View>
                )}
                <View
                  style={[
                    styles.chatBubble,
                    m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                  ]}>
                  <Text
                    style={[
                      styles.chatBubbleText,
                      m.role === 'user' ? styles.chatBubbleTextUser : styles.chatBubbleTextAi,
                    ]}>
                    {m.text}
                  </Text>

                  {m.recipe && (
                    <View style={styles.chatRecipeCard}>
                      <View style={styles.chatRecipeTop}>
                        <Text style={styles.chatRecipeTitle}>🍳 {m.recipe.title}</Text>
                        <Text style={styles.chatRecipeMeta}>
                          {m.recipe.pantryMatchPercent ?? 0}% in pantry
                        </Text>
                      </View>
                      {chatRecipeOutcomes[m.id] ? (
                        <View style={styles.missingAddedBox}>
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                          <Text style={styles.missingAddedText}>
                            {chatRecipeOutcomes[m.id].summary}
                          </Text>
                        </View>
                      ) : m.recipe.missingIngredients.length > 0 ? (
                        <TouchableOpacity
                          style={styles.btnAddMissing}
                          disabled={addingRecipeId === (m.recipe.id || m.recipe.title)}
                          onPress={() => handleGetAllForRecipe(m.recipe!, m.id)}>
                          <Ionicons name="cart-outline" size={14} color="#FFF" />
                          <Text style={styles.btnAddMissingText}>
                            Get All ({m.recipe.missingIngredients.length} missing)
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {m.products && m.products.length > 0 && (
                    <View style={styles.chatProductsContainer}>
                      <Text style={styles.chatProductsHeader}>UK Catalogue Suggestions:</Text>
                      {m.products.map((p) => {
                        const isAdded = chatAddedMap[p.id];
                        return (
                          <View key={p.id} style={styles.chatProductCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.chatProductName} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={styles.chatProductReason}>
                                £{Number(p.price).toFixed(2)} · {p.reason}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.btnChatAdd, isAdded && styles.btnChatAdded]}
                              disabled={isAdded}
                              onPress={() => handleAddChatProductToList(p)}>
                              <Text
                                style={[
                                  styles.btnChatAddText,
                                  isAdded && styles.btnChatAddedText,
                                ]}>
                                {isAdded ? '✓ Added' : '+ Add'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {m.followUps && m.followUps.length > 0 && (
                    <View style={styles.chatFollowUpRow}>
                      {m.followUps.map((f, fIdx) => (
                        <TouchableOpacity
                          key={fIdx}
                          style={styles.chatFollowUpChip}
                          onPress={() => handleSendChatMessage(f)}>
                          <Text style={styles.chatFollowUpText}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {chatLoading && (
              <View style={[styles.chatMsgRow, styles.chatMsgRowAi]}>
                <View style={styles.chatBotAvatar}>
                  <Ionicons name="sparkles" size={13} color="#FFF" />
                </View>
                <View style={[styles.chatBubble, styles.chatBubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
                    Gemini is analyzing your consumption & pantry...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompts */}
          <View style={styles.chatQuickPromptsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {QUICK_PROMPTS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chatQuickPromptChip}
                  onPress={() => handleSendChatMessage(q)}>
                  <Text style={styles.chatQuickPromptText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Ask: 'What do I need?' or 'What's expiring?'..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendChatMessage()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.btnChatSend,
                (!inputText.trim() || chatLoading) && { opacity: 0.4 },
              ]}
              disabled={!inputText.trim() || chatLoading}
              onPress={() => handleSendChatMessage()}>
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Fetching grocery intelligence...</Text>
            </View>
          ) : (
            <View>
              {/* ======================================================== */}
              {/* VIEW 1: CHEF RECIPES                                     */}
              {/* ======================================================== */}
              {activeTab === 'recipes' && (
                <View>
                  <View style={styles.heroCard}>
                    <View style={styles.heroIconBox}>
                      <Ionicons name="sparkles" size={24} color="#FFF" />
                    </View>
                    <View style={styles.heroTextBox}>
                      <Text style={styles.heroTitle}>Zero-Waste Kitchen Chef</Text>
                      <Text style={styles.heroSubtitle}>
                        {recipesSummary ||
                          (recipesSource === 'GEMINI_AI'
                            ? 'Personalized UK recipes prioritized by expiring pantry items'
                            : 'Tap Get All on any dish to check your pantry & add missing items')}
                      </Text>
                    </View>
                  </View>

                  {/* Craving Search & Inspire Me */}
                  <View style={styles.recipeFilterBox}>
                    <View style={styles.recipeSearchRow}>
                      <TextInput
                        style={styles.recipeSearchInput}
                        placeholder="Craving? (chicken, pasta, curry, eggs)..."
                        placeholderTextColor="#9CA3AF"
                        value={recipeQuery}
                        onChangeText={setRecipeQuery}
                        onSubmitEditing={() => loadRecipesOnly({ mealType: mealFilter, query: recipeQuery })}
                      />
                      <TouchableOpacity
                        style={styles.recipeFindBtn}
                        onPress={() => loadRecipesOnly({ mealType: mealFilter, query: recipeQuery })}>
                        <Ionicons name="search" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recipeInspireBtn}
                        onPress={() => {
                          setRecipeQuery('');
                          loadRecipesOnly({ mealType: mealFilter, query: '', refresh: true });
                        }}>
                        <Ionicons name="shuffle" size={16} color={BrandColors.primary} />
                        <Text style={styles.recipeInspireText}>Inspire</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
                      {MEAL_FILTERS.map((f) => (
                        <TouchableOpacity
                          key={f.key}
                          style={[
                            styles.filterChip,
                            mealFilter === f.key && styles.filterChipActive,
                          ]}
                          onPress={() => {
                            setMealFilter(f.key);
                            loadRecipesOnly({ mealType: f.key, query: recipeQuery });
                          }}>
                          <Text
                            style={[
                              styles.filterChipText,
                              mealFilter === f.key && styles.filterChipTextActive,
                            ]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {recipesLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={BrandColors.primary} />
                      <Text style={styles.loadingText}>Finding delicious dishes...</Text>
                    </View>
                  ) : recipes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="restaurant-outline" size={54} color="#9CA3AF" />
                      <Text style={styles.emptyTitle}>No Recipes Available Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Tap Inspire or clear your search filter to explore curated UK dishes.
                      </Text>
                    </View>
                  ) : (
                    recipes.map((recipe) => {
                      const recipeKey = recipe.id || recipe.title;
                      const isExpanded = expandedRecipeId === recipeKey;
                      const confirmedInPantry = recipe.usedPantryItems.filter((u) => u.isFromPantry);
                      const totalIngs = confirmedInPantry.length + recipe.missingIngredients.length;
                      const matchPct =
                        typeof recipe.pantryMatchPercent === 'number'
                          ? recipe.pantryMatchPercent
                          : totalIngs > 0
                          ? Math.round((confirmedInPantry.length / totalIngs) * 100)
                          : 0;
                      const getAllOutcome = getAllResults[recipeKey];
                      return (
                        <View key={recipeKey} style={styles.recipeCard}>
                          <TouchableOpacity
                            style={styles.recipeHeader}
                            onPress={() =>
                              setExpandedRecipeId(isExpanded ? null : recipeKey)
                            }>
                            <View style={{ flex: 1 }}>
                              <View style={styles.badgeRow}>
                                <View style={styles.wasteScoreBadge}>
                                  <Ionicons name="leaf" size={12} color="#059669" />
                                  <Text style={styles.wasteScoreText}>
                                    {recipe.wasteReductionScore}% Zero-Waste
                                  </Text>
                                </View>
                                <View style={styles.pantryPctBadge}>
                                  <Text style={styles.pantryPctText}>
                                    {confirmedInPantry.length}/{totalIngs} in Pantry ({matchPct}%)
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.recipeTitle}>{recipe.title}</Text>
                              <Text style={styles.recipeDesc} numberOfLines={isExpanded ? 0 : 2}>
                                {recipe.description}
                              </Text>

                              <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                                  <Text style={styles.metaText}>{recipe.prepTimeMinutes} mins</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="people-outline" size={14} color="#6B7280" />
                                  <Text style={styles.metaText}>{recipe.servings} servings</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="speedometer-outline" size={14} color="#6B7280" />
                                  <Text style={styles.metaText}>{recipe.difficulty}</Text>
                                </View>
                              </View>
                            </View>

                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={20}
                              color="#6B7280"
                              style={{ marginLeft: 8 }}
                            />
                          </TouchableOpacity>

                          {/* Always show Quick Get All button + Expandable Details */}
                          {!isExpanded && recipe.missingIngredients && recipe.missingIngredients.length > 0 && !getAllOutcome && (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                              <TouchableOpacity
                                style={[
                                  styles.btnAddMissing,
                                  addingRecipeId === recipeKey && { opacity: 0.7 },
                                ]}
                                disabled={addingRecipeId === recipeKey}
                                onPress={() => handleGetAllForRecipe(recipe)}>
                                <Ionicons name="cart-outline" size={16} color="#FFF" />
                                <Text style={styles.btnAddMissingText}>
                                  Get All • Check Pantry & Add ({recipe.missingIngredients.length} items)
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {isExpanded && (
                            <View style={styles.recipeExpandedContent}>
                              {/* Confirmed Pantry Items */}
                              <Text style={styles.sectionHeader}>
                                In Your Pantry ({confirmedInPantry.length}):
                              </Text>
                              {confirmedInPantry.length > 0 ? (
                                <View style={styles.tagsContainer}>
                                  {confirmedInPantry.map((ing, idx) => (
                                    <View key={idx} style={styles.pantryTag}>
                                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                                      <Text style={styles.pantryTagText}>
                                        {ing.name} ({ing.quantity})
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <Text style={styles.emptyPantryNote}>
                                  None in your pantry yet — tap Get All below to add everything to your list!
                                </Text>
                              )}

                              {/* Missing Ingredients & Get All */}
                              {recipe.missingIngredients && recipe.missingIngredients.length > 0 ? (
                                <View style={styles.missingBox}>
                                  <View style={styles.missingHeaderRow}>
                                    <Text style={styles.sectionHeader}>
                                      Need to Buy ({recipe.missingIngredients.length}):
                                    </Text>
                                    <Text style={styles.missingPriceSummary}>
                                      +£
                                      {recipe.missingIngredients
                                        .reduce((acc, m) => acc + (Number(m.estimatedPriceGbp) || 0), 0)
                                        .toFixed(2)}
                                    </Text>
                                  </View>

                                  <View style={styles.tagsContainer}>
                                    {recipe.missingIngredients.map((m, idx) => (
                                      <TouchableOpacity
                                        key={idx}
                                        style={styles.missingTag}
                                        onPress={() => handleAddSingleMissingToList(recipe, m)}>
                                        <Ionicons name="add-circle" size={13} color="#DC2626" />
                                        <Text style={styles.missingTagText}>
                                          {m.name} (£{(Number(m.estimatedPriceGbp) || 1.5).toFixed(2)})
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>

                                  <TouchableOpacity
                                    style={[
                                      styles.btnAddMissing,
                                      addingRecipeId === recipeKey && { opacity: 0.7 },
                                    ]}
                                    disabled={addingRecipeId === recipeKey}
                                    onPress={() => handleGetAllForRecipe(recipe)}>
                                    {addingRecipeId === recipeKey ? (
                                      <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                      <>
                                        <Ionicons name="cart-outline" size={16} color="#FFF" />
                                        <Text style={styles.btnAddMissingText}>
                                          Get All • Check Pantry & Add Missing
                                        </Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              ) : getAllOutcome ? (
                                <View style={styles.missingAddedBox}>
                                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                                  <Text style={styles.missingAddedText}>
                                    {getAllOutcome.summary}
                                  </Text>
                                </View>
                              ) : null}

                              {/* Step-by-Step Instructions */}
                              <Text style={styles.sectionHeader}>Instructions:</Text>
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
                    wasteRisks.map((w, idx) => (
                      <View key={idx} style={styles.riskCard}>
                        <View style={styles.riskHeader}>
                          <Text style={styles.riskTitle}>{w.productName}</Text>
                          <View
                            style={[
                              styles.urgencyPill,
                              {
                                backgroundColor:
                                  w.riskLevel === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                              },
                            ]}>
                            <Text
                              style={[
                                styles.urgencyText,
                                {
                                  color:
                                    w.riskLevel === 'CRITICAL' ? '#DC2626' : '#D97706',
                                },
                              ]}>
                              {w.riskLevel}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.riskSub}>
                          {w.quantity} {w.unit} remaining · Expires in {w.daysUntilExpiry} days
                        </Text>
                        <Text style={styles.riskAction}>💡 {w.suggestedAction}</Text>
                      </View>
                    ))
                  )}

                  {/* Section B: Automated Replenishments */}
                  <Text style={[styles.groupHeading, { marginTop: 24 }]}>
                    📦 Predicted Household Replenishments
                  </Text>
                  {replenishments.length === 0 ? (
                    <View style={styles.safeCard}>
                      <Ionicons name="checkmark-done" size={24} color="#059669" />
                      <Text style={styles.safeText}>
                        All pantry essentials are sufficiently stocked based on consumption patterns.
                      </Text>
                    </View>
                  ) : (
                    replenishments.map((rep) => (
                      <View key={rep.productId} style={styles.repCard}>
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
                          <Ionicons name="cart" size={16} color="#FFF" />
                          <Text style={styles.btnRepAddText}>+ Add</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  toastBanner: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#065F46',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    padding: 4,
    borderRadius: 10,
    margin: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.dark,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },

  // Recipes Styles
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  recipeHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  wasteScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  wasteScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  cuisineText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.dark,
  },
  recipeDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  recipeExpandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pantryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  pantryTagText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    marginLeft: 4,
  },
  missingBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  missingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missingPriceSummary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  missingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 6,
  },
  missingTagText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    marginLeft: 4,
  },
  btnAddMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  btnAddMissingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  missingAddedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  missingAddedText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    marginLeft: 8,
    lineHeight: 16,
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

  // Assistant Chat Styles
  chatScrollContent: {
    padding: 16,
    gap: 12,
  },
  chatMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  chatMsgRowUser: {
    justifyContent: 'flex-end',
  },
  chatMsgRowAi: {
    justifyContent: 'flex-start',
  },
  chatBotAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  chatBubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatBubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  chatBubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chatBubbleTextAi: {
    color: '#1F2937',
  },
  chatProductsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  chatProductsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  chatProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatProductName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  chatProductReason: {
    fontSize: 10,
    color: '#059669',
    marginTop: 1,
  },
  btnChatAdd: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  btnChatAdded: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  btnChatAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  btnChatAddedText: {
    color: '#6B7280',
  },
  chatQuickPromptsBar: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  chatQuickPromptChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatQuickPromptText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  btnChatSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeFilterBox: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  recipeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipeSearchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
  },
  recipeFindBtn: {
    backgroundColor: BrandColors.primary,
    padding: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInspireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#C5E1A5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  recipeInspireText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4D7C0F',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  pantryPctBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  pantryPctText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  emptyPantryNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  chatRecipeCard: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  chatRecipeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatRecipeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 6,
  },
  chatRecipeMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  chatFollowUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chatFollowUpChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chatFollowUpText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
});
