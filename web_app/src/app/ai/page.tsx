"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ChefHat,
  Bot,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  Plus,
  Check,
  Send,
  Loader2,
  CheckCircle2,
  Utensils,
  BookOpen,
} from "lucide-react";
import {
  api,
  RecipeItem,
  ReplenishmentItem,
  WasteRiskItem,
  ChatAssistantResponse,
} from "@/lib/api";

type TabMode = "recipes" | "assistant" | "insights";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
}

const QUICK_PROMPTS = [
  "🛒 What do I need to buy?",
  "⏳ What is expiring soon?",
  "🍳 Suggest a meal from my pantry",
  "💰 How is my grocery budget?",
];

export default function AIScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>("recipes");
  const [loading, setLoading] = useState(true);

  // Recipes State
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [recipesSource, setRecipesSource] = useState("");
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [addedRecipesMap, setAddedRecipesMap] = useState<Record<string, boolean>>({});

  // Insights State
  const [replenishments, setReplenishments] = useState<ReplenishmentItem[]>([]);
  const [wasteRisks, setWasteRisks] = useState<WasteRiskItem[]>([]);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! 👋 I'm your SmartGrocer Assistant. Powered by Gemini and live Python forecasting, ask me 'What do I need?' or 'What's expiring?' to stay ahead on your groceries!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAddedMap, setChatAddedMap] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipeRes, repRes, wasteRes] = await Promise.allSettled([
        api.getRecipes(),
        api.getReplenishments(),
        api.getWasteRisks(),
      ]);

      if (recipeRes.status === "fulfilled" && recipeRes.value?.data) {
        setRecipes(recipeRes.value.data.recipes || []);
        setRecipesSource(recipeRes.value.data.source || "");
      }
      if (repRes.status === "fulfilled" && repRes.value?.data) {
        setReplenishments(repRes.value.data.replenishments || []);
      }
      if (wasteRes.status === "fulfilled" && wasteRes.value?.data) {
        setWasteRisks(wasteRes.value.data.atRiskItems || []);
      }
    } catch (err) {
      console.error("Failed to load AI data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "assistant") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Handle Add Missing Ingredients
  const handleAddMissingToList = async (recipe: RecipeItem) => {
    const recipeKey = recipe.id || recipe.title;
    try {
      setAddingRecipeId(recipeKey);
      const listsRes = await api.getShoppingLists();
      const lists = listsRes?.data || [];
      let targetList = lists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");

      if (!targetList) {
        const createRes = await api.createShoppingList("My Smart List", 50, "GBP");
        targetList = createRes.data;
      }

      let addedCount = 0;
      for (const item of recipe.missingIngredients) {
        let prodId = item.matchedProductId;
        if (!prodId) {
          try {
            const searchRes = await api.getProducts({ search: item.name, pageSize: 1 });
            if (searchRes?.data && searchRes.data.length > 0) {
              prodId = searchRes.data[0].id;
            }
          } catch {}
        }

        if (prodId) {
          await api.addItemToList(targetList.id, prodId, 1, `For: ${recipe.title}`);
          addedCount++;
        }
      }

      // Mark recipe as added and remove missing ingredients from the UI
      setAddedRecipesMap((prev) => ({ ...prev, [recipeKey]: true }));
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipe.id || r.title === recipe.title
            ? { ...r, missingIngredients: [] }
            : r
        )
      );

      showToast(`✓ Added ${addedCount} missing ingredient(s) to "${targetList.name}"!`);
    } catch (err: any) {
      alert("Could not add items to shopping list: " + err.message);
    } finally {
      setAddingRecipeId(null);
    }
  };

  const handleAddSingleMissing = async (
    recipe: RecipeItem,
    item: RecipeItem["missingIngredients"][0]
  ) => {
    const recipeKey = recipe.id || recipe.title;
    try {
      const listsRes = await api.getShoppingLists();
      const lists = listsRes?.data || [];
      let targetList = lists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");

      if (!targetList) {
        const createRes = await api.createShoppingList("My Smart List", 50, "GBP");
        targetList = createRes.data;
      }

      let prodId = item.matchedProductId;
      if (!prodId) {
        try {
          const searchRes = await api.getProducts({ search: item.name, pageSize: 1 });
          if (searchRes?.data && searchRes.data.length > 0) {
            prodId = searchRes.data[0].id;
          }
        } catch {}
      }

      if (prodId) {
        await api.addItemToList(targetList.id, prodId, 1, `For: ${recipe.title}`);
        showToast(`✓ Added "${item.name}" to "${targetList.name}"!`);

        setRecipes((prev) =>
          prev.map((r) => {
            if (r.id === recipe.id || r.title === recipe.title) {
              const updatedMissing = r.missingIngredients.filter((m) => m.name !== item.name);
              if (updatedMissing.length === 0) {
                setAddedRecipesMap((p) => ({ ...p, [recipeKey]: true }));
              }
              return { ...r, missingIngredients: updatedMissing };
            }
            return r;
          })
        );
      }
    } catch (err: any) {
      alert("Could not add item to shopping list: " + err.message);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setChatLoading(true);

    try {
      const res = await api.chatWithAssistant(query);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: res.data.reply,
        products: res.data.suggestedProducts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ ${err.message || "Failed to reach assistant. Please try again."}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#166534] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#84C225]" />
          <span>Chef Gemini & AI Insights</span>
        </h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Zero-waste meal ideas from your pantry, intelligent forecasting, and instant assistant advice.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-2xs max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("recipes")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "recipes"
              ? "bg-[#84C225] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Chef Recipes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assistant")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "assistant"
              ? "bg-[#84C225] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("insights")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "insights"
              ? "bg-[#84C225] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Smart Insights</span>
        </button>
      </div>

      {/* SUB-TAB 1: CHEF RECIPES */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="bg-[#F1F8E9] border border-[#C5E1A5] rounded-3xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">👨‍🍳</span>
              <p className="text-xs text-[#689F38] font-bold">
                {recipesSource === "GEMINI_AI"
                  ? "Powered by Google Gemini: Prioritizing expiring pantry items to prevent waste."
                  : "Zero-Waste Pantry Meals: Smartly matched with UK grocery stock."}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse h-64" />
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map((recipe) => {
                const recipeKey = recipe.id || recipe.title;
                const isExpanded = expandedRecipeId === recipeKey;
                const hasMissing = recipe.missingIngredients && recipe.missingIngredients.length > 0;
                const isAdding = addingRecipeId === recipeKey;
                const wasAdded = addedRecipesMap[recipeKey];

                return (
                  <div
                    key={recipeKey}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Recipe Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            {recipe.wasteReductionScore}% Zero-Waste Score
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-gray-900 mt-1">
                            {recipe.title}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {recipe.cuisine}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>

                      {/* Meta Tags */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mt-3 pt-3 border-t border-gray-50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {recipe.prepTimeMinutes} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {recipe.servings} servings
                        </span>
                        <span className="font-bold text-[#689F38]">
                          {recipe.difficulty}
                        </span>
                      </div>

                      {/* Ingredients From Pantry */}
                      <div className="mt-3">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          From Your Pantry:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.usedPantryItems.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {p.name} ({p.quantity})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Missing Groceries Box (Removes upon addition!) */}
                      {hasMissing ? (
                        <div className="mt-3 p-3.5 bg-red-50/70 border border-red-100 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-red-900">Missing Groceries:</span>
                            <span className="font-black text-red-700">
                              +£
                              {recipe.missingIngredients
                                .reduce((acc, m) => acc + (Number(m.estimatedPriceGbp) || 0), 0)
                                .toFixed(2)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {recipe.missingIngredients.map((m, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAddSingleMissing(recipe, m)}
                                title="Click to add single ingredient"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{m.name}</span>
                                <span className="opacity-75">
                                  (£{(Number(m.estimatedPriceGbp) || 1.5).toFixed(2)})
                                </span>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={isAdding}
                            onClick={() => handleAddMissingToList(recipe)}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isAdding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Missing Ingredients to Shopping List</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : wasAdded ? (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Missing ingredients added to your active shopping list!</span>
                        </div>
                      ) : null}

                      {/* Instructions Toggle */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                          <span className="text-xs font-bold text-gray-800 block">
                            Instructions:
                          </span>
                          <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600">
                            {recipe.instructions.map((step, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ol>

                          {recipe.chefTip && (
                            <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                              <span className="font-bold">💡 Chef Tip:</span> {recipe.chefTip}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRecipeId(isExpanded ? null : recipeKey)
                      }
                      className="w-full py-2 text-center text-xs font-bold text-gray-500 hover:text-gray-800 border-t border-gray-50 pt-2 cursor-pointer"
                    >
                      {isExpanded ? "Hide Instructions ▲" : "View Step-by-Step Instructions ▼"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
              <ChefHat className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-gray-800">No recipes yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                Add groceries to your pantry or ask Chef Gemini to create tailored meal ideas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: AI ASSISTANT CHAT */}
      {activeTab === "assistant" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* Quick Prompts */}
          <div className="bg-[#F1F8E9] p-3 border-b border-green-100 flex gap-2 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChatMessage(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold bg-white text-[#689F38] border border-[#C5E1A5] hover:bg-[#84C225] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[80%] space-y-2">
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#84C225] text-white rounded-tr-xs shadow-xs"
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-1.5">
                      {msg.products.map((p) => {
                        const isAdded = !!chatAddedMap[p.id];
                        return (
                          <div
                            key={p.id}
                            className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">{p.name}</span>
                              <span className="text-[11px] font-semibold text-emerald-700">
                                £{Number(p.price).toFixed(2)}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={async () => {
                                setChatAddedMap((prev) => ({ ...prev, [p.id]: true }));
                                const listsRes = await api.getShoppingLists();
                                const lists = listsRes?.data || [];
                                let targetList = lists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");
                                if (!targetList) {
                                  const createRes = await api.createShoppingList("My Smart List", 50, "GBP");
                                  targetList = createRes.data;
                                }
                                await api.addItemToList(targetList.id, p.id, 1, "Added from Chef AI");
                                showToast(`✓ Added ${p.name}`);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                isAdded
                                  ? "bg-gray-100 text-gray-500"
                                  : "bg-[#84C225] hover:bg-[#689F38] text-white"
                              }`}
                            >
                              {isAdded ? "Added" : "+ Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2.5 items-center text-xs text-gray-500 italic">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#84C225]" />
                  <span>Gemini is generating response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about groceries, cooking, expiry..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || chatLoading}
              className="p-2.5 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: SMART INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Replenishments */}
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#84C225]" />
              <span>Demand Predictions (Replenishment Radar)</span>
            </h3>

            {replenishments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {replenishments.map((rep) => (
                  <div
                    key={rep.productId}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {rep.urgency}
                      </span>
                      <span className="text-gray-400 font-semibold">
                        Confidence: {(rep.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-gray-900">{rep.productName}</h4>
                    <p className="text-xs text-gray-500">{rep.reason}</p>
                    <span className="text-[11px] font-bold text-emerald-700 block">
                      Estimated ~{rep.estimatedDaysUntilDepleted} days until depleted
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-500 border border-gray-100">
                No immediate replenishment needs detected.
              </div>
            )}
          </div>

          {/* Waste Risk */}
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Food Waste Risk Analyzer</span>
            </h3>

            {wasteRisks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wasteRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        {risk.riskLevel} Risk
                      </span>
                      <span className="text-gray-400 font-semibold">
                        Expires in {risk.daysUntilExpiry}d
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-gray-900">{risk.productName}</h4>
                    <p className="text-xs text-gray-600">{risk.suggestedAction}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-500 border border-gray-100">
                No food waste risks detected in pantry.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

