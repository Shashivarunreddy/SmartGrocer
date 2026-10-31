"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBasket,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Plus,
  Check,
  Clock,
  TrendingDown,
  Layers,
  ChevronRight,
  Search,
} from "lucide-react";
import { api, Product, PantryItem, ReplenishmentItem } from "@/lib/api";

const CATEGORIES = [
  { name: "Fresh Produce", icon: "🥦", query: "Produce" },
  { name: "Dairy & Eggs", icon: "🥛", query: "Dairy" },
  { name: "Bakery", icon: "🍞", query: "Bakery" },
  { name: "Meat & Fish", icon: "🥩", query: "Meat" },
  { name: "Beverages", icon: "🧃", query: "Beverages" },
  { name: "Pantry Staples", icon: "🥫", query: "Pantry" },
];

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [replenishments, setReplenishments] = useState<ReplenishmentItem[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
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
      const [aiResult, pantryResult, listsResult, profileResult] = await Promise.allSettled([
        api.getReplenishments().catch(() => null),
        api.getExpiringPantryItems().catch(() => ({ data: [] })),
        api.getShoppingLists().catch(() => ({ data: [] })),
        api.getProfile().catch(() => null),
      ]);

      const aiRes = aiResult.status === "fulfilled" ? aiResult.value : null;
      const pantryRes = pantryResult.status === "fulfilled" ? pantryResult.value : null;
      const listsRes = listsResult.status === "fulfilled" ? listsResult.value : null;
      const profileRes = profileResult.status === "fulfilled" ? profileResult.value : null;

      const profileBudget = Number(profileRes?.data?.defaultBudget);

      if (aiRes?.data?.replenishments && aiRes.data.replenishments.length > 0) {
        setReplenishments(aiRes.data.replenishments);
      } else {
        const prodRes = await api.getProducts({ pageSize: 4 }).catch(() => null);
        if (prodRes?.data) setSuggestedProducts(prodRes.data);
      }

      setExpiringItems(pantryRes?.data || []);

      const lists = listsRes?.data || [];
      const activeCandidate = lists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");
      const currentBudget =
        !isNaN(profileBudget) && profileBudget > 0
          ? profileBudget
          : (activeCandidate && Number(activeCandidate.budget)) || 75;

      if (activeCandidate && activeCandidate.items && activeCandidate.items.length > 0) {
        setActiveListId(activeCandidate.id);
        const total = activeCandidate.items.reduce(
          (sum, i) => sum + (Number(i.product?.defaultUnitPrice) || 0) * (Number(i.quantity) || 1),
          0
        );
        setStats({
          activeListCount: activeCandidate.items.length,
          estimatedTotal: Number(total.toFixed(2)),
          budget: currentBudget,
        });
      } else {
        setActiveListId(null);
        setStats({
          activeListCount: 0,
          estimatedTotal: 0,
          budget: currentBudget,
        });
      }
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleAddRecommended = async (item: ReplenishmentItem) => {
    try {
      setAddingId(item.productId);
      setAddedMap((prev) => ({
        ...prev,
        [item.productId]: (prev[item.productId] || 0) + 1,
      }));

      const itemCost =
        Number(item.defaultUnitPrice || 1.99) * Math.max(1, Math.round(item.suggestedQuantity));
      setStats((prev) => ({
        ...prev,
        activeListCount: prev.activeListCount + 1,
        estimatedTotal: Number((prev.estimatedTotal + itemCost).toFixed(2)),
      }));

      let listId = activeListId;
      if (!listId) {
        const listsRes = await api.getShoppingLists();
        const activeList = listsRes?.data?.find(
          (l) => l.status === "ACTIVE" || l.status === "DRAFT"
        );
        if (activeList) {
          listId = activeList.id;
          setActiveListId(listId);
        } else {
          const newList = await api.createShoppingList("My Weekly Grocery", 75, "GBP");
          listId = newList.data.id;
          setActiveListId(listId);
        }
      }

      await api.addItemToList(listId, item.productId, Math.max(1, Math.round(item.suggestedQuantity)));
    } catch {
      setAddedMap((prev) => {
        const copy = { ...prev };
        delete copy[item.productId];
        return copy;
      });
    } finally {
      setAddingId(null);
    }
  };

  const budgetUsagePercent = Math.min(
    100,
    Math.round((stats.estimatedTotal / (stats.budget || 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#84C225] to-[#689F38] text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              SmartGrocer AI Live
            </span>
            <span className="text-xs font-semibold text-white/80">⚡ 1,000 UK Catalogue Items</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Smart Grocery Assistant</h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl font-medium">
            Save money with ML bill estimates, prevent pantry food waste, and let Chef Gemini plan your meals.
          </p>
        </div>

        <Link
          href="/catalogue"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#689F38] font-bold text-xs sm:text-sm shadow-sm hover:bg-gray-50 transition-colors shrink-0"
        >
          <Search className="w-4 h-4" />
          <span>Shop Catalogue</span>
        </Link>
      </div>

      {/* Budget & Shopping Overview Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Active Run
            </span>
            <h3 className="text-lg font-black text-gray-900 leading-tight">Weekly Budget Tracker</h3>
          </div>
          <Link
            href="/lists"
            className="flex items-center gap-1 text-xs font-bold text-[#689F38] hover:text-[#84C225] transition-colors"
          >
            <span>View List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 my-2 text-center">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Est. Bill</span>
            <span className="text-base sm:text-xl font-black text-gray-900 block mt-0.5">
              £{stats.estimatedTotal.toFixed(2)}
            </span>
          </div>
          <div className="border-x border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 block">Target Budget</span>
            <span className="text-base sm:text-xl font-black text-gray-900 block mt-0.5">
              £{stats.budget.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Items</span>
            <span className="text-base sm:text-xl font-black text-gray-900 block mt-0.5">
              {stats.activeListCount}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetUsagePercent > 90 ? "bg-[#DC2626]" : "bg-[#84C225]"
              }`}
              style={{ width: `${budgetUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs font-semibold">
            <span className="text-gray-500">{budgetUsagePercent}% of budget estimated</span>
            {budgetUsagePercent > 100 ? (
              <span className="text-red-600 font-bold">Over Budget by £{(stats.estimatedTotal - stats.budget).toFixed(2)}</span>
            ) : (
              <span className="text-emerald-700 font-bold">£{(stats.budget - stats.estimatedTotal).toFixed(2)} remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Expiring Soon Alert Banner */}
      {expiringItems.length > 0 && (
        <Link
          href="/pantry"
          className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-2xs hover:bg-amber-100/60 transition-colors group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900">
                {expiringItems.length} Pantry {expiringItems.length === 1 ? "Item" : "Items"} Expiring Soon!
              </h4>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Consume soon or check Chef Gemini zero-waste recipes before food spoils.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>Manage</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      )}

      {/* Quick Category Jump Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 tracking-tight">Explore Categories</h3>
          <Link href="/catalogue" className="text-xs font-bold text-[#689F38]">
            See All
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/catalogue?category=${encodeURIComponent(cat.query)}`}
              className="bg-white p-3.5 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-2xs hover:border-[#84C225] hover:shadow-xs transition-all group"
            >
              <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="text-xs font-bold text-gray-800 leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Smart Replenishments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#84C225]" />
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Predicted Replenishments (Python AI)
            </h3>
          </div>
          <Link href="/ai" className="text-xs font-bold text-[#689F38]">
            AI Forecast
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 animate-pulse h-32" />
            ))}
          </div>
        ) : replenishments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {replenishments.slice(0, 6).map((item) => {
              const isAdded = !!addedMap[item.productId];
              const isUrgent = item.urgency === "CRITICAL" || item.urgency === "HIGH";

              return (
                <div
                  key={item.productId}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between hover:border-gray-200 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.urgency} Urgency
                      </span>
                      <span className="text-[11px] text-gray-400 font-semibold">
                        ~{item.estimatedDaysUntilDepleted}d left
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-gray-900 leading-tight">{item.productName}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">{item.reason}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-xs font-bold text-gray-900">
                      £{Number(item.defaultUnitPrice || 1.99).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      disabled={addingId === item.productId}
                      onClick={() => handleAddRecommended(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAdded
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#84C225] hover:bg-[#689F38] text-white shadow-2xs"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to List</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
            <span className="text-3xl mb-2 block">✨</span>
            <h4 className="text-sm font-bold text-gray-800">Your pantry is well-stocked!</h4>
            <p className="text-xs text-gray-500 mt-1">
              Python demand models haven&apos;t detected any critical grocery depletion risks yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
