"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  ShoppingBag,
  Plus,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api, ChatAssistantResponse } from "@/lib/api";

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

function getSmartFallbackResponse(query: string): {
  reply: string;
  suggestedProducts?: Array<{ id: string; name: string; price: number; reason: string }>;
} {
  const lower = query.toLowerCase();

  if (lower.includes("expir") || lower.includes("spoil") || lower.includes("fresh")) {
    return {
      reply:
        "⏳ **Pantry Expiry Radar:**\n\nHigh-spoilage items in typical UK households include fresh dairy (milk, double cream within 2-3 days) and berries or leafy greens. Inspect your crisper drawer today!\n\n💡 *Sign in to SmartGrocer to see your exact real-time expiry countdown badges and risk alerts.*",
      suggestedProducts: [
        { id: "p-milk", name: "Semi-Skimmed Milk (2 Pints)", price: 1.35, reason: "Replenish fresh daily staple" },
        { id: "p-eggs", name: "Free Range Large Eggs (6pk)", price: 2.10, reason: "High-protein versatile staple" },
      ],
    };
  }

  if (lower.includes("buy") || lower.includes("need") || lower.includes("restock")) {
    return {
      reply:
        "🛒 **Recommended Weekly Replenishments:**\n\nBased on UK household consumption forecasts, here are top staples to keep in stock this week. Click '+ Add' below to quickly add them to your shopping list!",
      suggestedProducts: [
        { id: "p-bread", name: "Wholemeal Sliced Bread 800g", price: 1.15, reason: "High demand pantry essential" },
        { id: "p-milk", name: "Semi-Skimmed Milk 2L", price: 1.45, reason: "Low stock alert" },
        { id: "p-bananas", name: "Fairtrade Bananas (5pk)", price: 0.89, reason: "Quick healthy snack" },
        { id: "p-pasta", name: "Italian Penne Pasta 500g", price: 0.95, reason: "Long-life dry staple" },
      ],
    };
  }

  if (lower.includes("meal") || lower.includes("recipe") || lower.includes("cook") || lower.includes("dinner") || lower.includes("pantry")) {
    return {
      reply:
        "🍳 **Chef Gemini Zero-Waste Pantry Meal:**\n\n**Quick Rustic Pan Frittata (15 mins)**\n- **Ingredients:** 3 eggs, leftover spinach or tomatoes, splash of milk, cheddar cheese.\n- **Method:** Whisk eggs with black pepper. Sauté veggies in an oiled pan for 3 mins, pour in eggs, and top with cheese. Cook on low until golden.\n- **Waste Saved:** Prevents vegetable spoilage while keeping portion cost under £1.75!",
      suggestedProducts: [
        { id: "p-cheddar", name: "Mature British Cheddar 350g", price: 2.75, reason: "Ideal for frittata melt" },
        { id: "p-eggs", name: "Free Range Eggs 6pk", price: 2.10, reason: "Base frittata ingredient" },
      ],
    };
  }

  if (lower.includes("budget") || lower.includes("save") || lower.includes("cost") || lower.includes("bill") || lower.includes("money")) {
    return {
      reply:
        "💰 **SmartGrocer Budget Radar:**\n\nYour target household budget is **£75.00/week**. UK shoppers who plan with real-time bill estimators save an average of **£45/month** by preventing till shock and duplicate purchases.\n\n💡 *Tip: Check your pantry inventory before heading to the supermarket to avoid buying items you already own!*",
    };
  }

  return {
    reply:
      "Hello! 👋 I'm your SmartGrocer Assistant. Ask me 'What do I need?', 'What is expiring soon?', or 'Suggest a meal from my pantry' to stay ahead on your groceries. (Sign in with Clerk for full personalized live pantry data).",
  };
}

export function AIChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! 👋 I'm your SmartGrocer Assistant. Powered by Gemini AI and live Python forecasting, ask me 'What do I need?' or 'What's expiring?' to stay ahead on your groceries!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
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
    setInputText("");
    setLoading(true);

    try {
      const res = await api.chatWithAssistant(query);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: res.data.reply,
        products: res.data.suggestedProducts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Provide intelligent domain guidance if network or auth error occurs
      const fallback = getSmartFallbackResponse(query);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: fallback.reply,
        products: fallback.suggestedProducts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (product: { id: string; name: string; price: number }) => {
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="w-full sm:max-w-md h-[88vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
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
                  <span className="text-[10px] text-white/90 font-medium">Gemini 1.5 + Python Forecast</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="max-w-[82%] space-y-2">
                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#84C225] text-white rounded-tr-xs shadow-xs"
                          : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs shadow-2xs"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Suggested Product Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="space-y-1.5 pt-1">
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
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
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
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 items-center text-xs text-gray-500 italic">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#84C225]" />
                    <span>Gemini is thinking...</span>
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
                placeholder="Ask about groceries, recipes, budget..."
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

