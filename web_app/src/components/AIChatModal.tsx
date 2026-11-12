"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Plus,
  Check,
  Loader2,
  ShoppingCart,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  api,
  RecipeItem,
  GetAllRecipeIngredientsResult,
} from "@/lib/api";

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
  recipe?: RecipeItem;
  followUps?: string[];
}

const QUICK_PROMPTS = [
  "What do I need to buy?",
  "🍳 Suggest a dinner dish",
  "⏳ What is expiring soon?",
  "🥛 Find fresh milk & dairy",
  "💰 How is my grocery budget?",
];

function getSmartFallbackResponse(query: string): {
  reply: string;
  suggestedProducts?: Array<{ id: string; name: string; price: number; reason: string }>;
  followUps?: string[];
} {
  const lower = query.toLowerCase();

  if (lower.includes("expir") || lower.includes("spoil") || lower.includes("fresh")) {
    return {
      reply:
        "⏳ **Pantry Expiry Radar:**\n\nHigh-spoilage items in typical UK households include fresh dairy (milk, double cream within 2–3 days) and salad greens.\n\n💡 *Sign in to see your real-time pantry countdown timers and match expiring food to recipes.*",
      followUps: ["🍳 Suggest a dinner dish", "What do I need to buy?"],
    };
  }

  if (lower.includes("meal") || lower.includes("recipe") || lower.includes("cook") || lower.includes("dinner")) {
    return {
      reply:
        "🍳 **Chef Gemini Zero-Waste Idea:**\n\nTry **Creamy Garlic Chicken & Spinach Penne** or **Loaded Spinach & Cheddar Omelette** — sign in to check your live pantry & click **Get All** to add missing items straight to your list!",
      followUps: ["🌶️ Make it spicy", "🥗 Show a vegetarian dish"],
    };
  }

  if (lower.includes("budget") || lower.includes("save") || lower.includes("cost") || lower.includes("bill")) {
    return {
      reply:
        "💰 **SmartGrocer Budget Radar:**\n\nYour default household target is **£75.00/week**. Check the **Shopping Lists** tab to apply supermarket own-brand swaps automatically.",
      followUps: ["What do I need to buy?", "🍳 Suggest a budget meal"],
    };
  }

  return {
    reply:
      "👋 I'm your SmartGrocer Assistant! Ask me to suggest a dinner dish, search our 2,849-product UK catalogue, or check what's expiring in your pantry.",
    followUps: ["🍳 Suggest a dinner dish", "🥛 Find fresh milk & dairy", "What do I need to buy?"],
  };
}

export function AIChatModal() {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! 👋 I'm your SmartGrocer Culinary & Pantry AI. Ask me what to cook tonight, search UK groceries, or let me check your pantry & build your list!",
      followUps: ["🍳 Suggest a dinner dish", "🥛 Find fresh milk & dairy"],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const [recipeAddingId, setRecipeAddingId] = useState<string | null>(null);
  const [recipeOutcomeMap, setRecipeOutcomeMap] = useState<Record<string, GetAllRecipeIngredientsResult>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setLoading(true);

    try {
      const recentHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.chatWithAssistant(query, recentHistory);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: res.data.reply,
        products: res.data.suggestedProducts,
        recipe: res.data.suggestedRecipe,
        followUps: res.data.suggestedFollowUps,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallback = getSmartFallbackResponse(query);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: fallback.reply,
        products: fallback.suggestedProducts,
        followUps: fallback.followUps,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAllRecipe = async (msgId: string, recipe: RecipeItem) => {
    if (!isSignedIn) {
      setMessages((prev) => [
        ...prev,
        {
          id: `auth-prompt-${Date.now()}`,
          role: "assistant",
          text: `👉 Please sign in to check your pantry and add "${recipe.title}" missing groceries to your shopping list!`,
        },
      ]);
      return;
    }

    try {
      setRecipeAddingId(msgId);
      const allIngs = [
        ...recipe.usedPantryItems.map((u) => ({
          name: u.name,
          quantity: u.quantity,
          suggestedCategory: "Groceries",
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
        ingredients: allIngs,
      });
      setRecipeOutcomeMap((prev) => ({ ...prev, [msgId]: res.data }));
    } catch (err) {
      console.error("Failed Get All in chat modal:", err);
    } finally {
      setRecipeAddingId(null);
    }
  };

  const handleAddProduct = async (product: { id: string; name: string; price: number }) => {
    if (!isSignedIn) {
      setMessages((prev) => [
        ...prev,
        {
          id: `auth-prompt-${Date.now()}`,
          role: "assistant",
          text: `👉 Please sign in to save "${product.name}" directly to your household shopping list!`,
        },
      ]);
      return;
    }

    try {
      setAddedMap((prev) => ({ ...prev, [product.id]: true }));
      const listsRes = await api.getShoppingLists();
      const lists = listsRes.data || [];
      let activeList = lists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");

      if (!activeList) {
        const createRes = await api.createShoppingList("My Smart List", 50, "GBP");
        activeList = createRes.data;
      }

      await api.addItemToList(activeList.id, product.id, 1, "Added from AI Assistant");
    } catch (err) {
      setAddedMap((prev) => ({ ...prev, [product.id]: false }));
      console.error("Failed to add product to list:", err);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ask AI"
        className="fixed bottom-20 md:bottom-6 right-5 z-40 bg-[#84C225] hover:bg-[#689F38] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-lg shadow-green-700/30 flex items-center gap-2.5 transition-transform hover:scale-105 active:scale-95 duration-200 cursor-pointer"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="hidden sm:inline font-bold text-sm">Ask AI</span>
      </button>

      {/* Slide-over / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md h-[88vh] sm:h-[620px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#84C225] text-white px-5 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight leading-none">SmartGrocer AI Assistant</h3>
                  <span className="text-[10px] text-white/90 font-medium">Pantry Chef • 2,849 UK Products</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Reset Chat"
                  onClick={() =>
                    setMessages([
                      {
                        id: "welcome",
                        role: "assistant",
                        text: "Fresh chat ready! Ask me what to cook, search dairy & groceries, or check your pantry.",
                        followUps: ["🍳 Suggest a dinner dish", "🥛 Find fresh milk & dairy"],
                      },
                    ])
                  }
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="bg-[#F1F8E9] px-3 py-2 border-b border-green-100 overflow-x-auto flex gap-1.5 scrollbar-none">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-[#689F38] border border-[#C5E1A5] hover:bg-[#84C225] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
              {messages.map((msg) => {
                const outcome = recipeOutcomeMap[msg.id];
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className="max-w-[84%] space-y-2">
                      <div
                        className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-[#84C225] text-white rounded-tr-xs shadow-xs"
                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs shadow-2xs"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Interactive Recipe Card Inside Drawer */}
                      {msg.recipe && (
                        <div className="bg-white rounded-2xl border border-emerald-200 p-3 shadow-2xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-black text-gray-900 leading-snug">
                              🍳 {msg.recipe.title}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              {msg.recipe.pantryMatchPercent ?? 0}% pantry
                            </span>
                          </div>
                          {outcome ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-[11px] text-emerald-900 space-y-1">
                              <div className="font-bold">✓ {outcome.summary}</div>
                              <Link
                                href="/lists"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 font-bold underline text-emerald-800"
                              >
                                <span>Open Shopping List</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : msg.recipe.missingIngredients.length > 0 ? (
                            <button
                              type="button"
                              disabled={recipeAddingId === msg.id}
                              onClick={() => handleGetAllRecipe(msg.id, msg.recipe!)}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>
                                Get All ({msg.recipe.missingIngredients.length} missing • ~£
                                {msg.recipe.missingIngredients
                                  .reduce((a, b) => a + (Number(b.estimatedPriceGbp) || 0), 0)
                                  .toFixed(2)}
                                )
                              </span>
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Suggested Product Cards */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          {msg.products.map((p) => {
                            const isAdded = !!addedMap[p.id];
                            return (
                              <div
                                key={p.id}
                                className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-gray-900 block truncate">
                                    {p.name}
                                  </span>
                                  <span className="text-[11px] font-semibold text-emerald-700">
                                    £{Number(p.price).toFixed(2)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddProduct(p)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                                    isAdded
                                      ? "bg-gray-100 text-gray-500"
                                      : "bg-[#84C225] hover:bg-[#689F38] text-white shadow-2xs"
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Contextual Follow-Up Chips */}
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.followUps.map((f, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSend(f)}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-gray-200 text-gray-700 hover:border-[#84C225] hover:text-[#689F38] cursor-pointer"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 items-center text-xs text-gray-500 italic">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#84C225]" />
                    <span>Checking pantry & UK catalogue...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about recipes, dairy, pantry, budget..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225] focus:border-transparent text-gray-800"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
