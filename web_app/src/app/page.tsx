"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
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
  Calculator,
  ShieldCheck,
  Zap,
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

/**
 * Public Landing Page
 * Rendered when the visitor is not signed in.
 * Introduces what SmartGrocer does and offers top sign-in / sign-up actions.
 */
function LandingPage() {
  return (
    <div className="space-y-16 pb-12 pt-2">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#84C225] via-[#689F38] to-[#1E3A1E] text-white rounded-3xl p-8 sm:p-14 shadow-xl shadow-green-950/10">
        <div className="max-w-2xl relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI-Powered UK Grocery Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Shop Smarter. <br />
            Waste Nothing. <br />
            <span className="text-yellow-300">Save More Every Week.</span>
          </h1>

          <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed">
            SmartGrocer pairs machine learning bill forecasting with dynamic pantry expiry tracking
            and zero-waste AI chef recipes tailored to over 1,000 UK supermarket products.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="px-6 py-3.5 rounded-2xl bg-white text-[#1F2937] text-sm font-black hover:bg-gray-50 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 text-[#84C225]" />
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button
                type="button"
                className="px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-sm font-bold backdrop-blur-md transition-all cursor-pointer"
              >
                Sign In
              </button>
            </SignInButton>

            <Link
              href="/catalogue"
              className="px-5 py-3.5 rounded-2xl text-white/85 hover:text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>Browse 1,000+ UK Products</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
              <Check className="w-3.5 h-3.5 text-yellow-300" /> 1,000+ UK Products
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
              <Calculator className="w-3.5 h-3.5 text-yellow-300" /> Live Bill Predictor
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
              <Clock className="w-3.5 h-3.5 text-yellow-300" /> Spoilage Alerts
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Four Superpowers in One App
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Designed specifically for UK households to conquer supermarket till shock and reduce avoidable waste.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F8E9] text-[#689F38] border border-[#C5E1A5] flex items-center justify-center shadow-inner">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Live Bill Predictor & Budget Radar
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                Tired of surprise checkout totals? Watch your shopping list calculate live subtotal estimations
                as you tick off items in real time, with intelligent alerts before you cross your weekly budget.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Pantry Expiry Radar & Spoilage Shield
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                Never discover rotten greens in the back of your fridge again. Visual countdown badges and risk
                scores warn you days before food goes bad so you eat it fresh and save money.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Chef Gemini Zero-Waste Recipes
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                Unsure what to cook? Powered by Google Gemini 2.5 Flash, the chef invents restaurant-quality meals
                crafted around the ingredients you currently own, with 1-click missing ingredient shopping additions.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-inner">
              <ShoppingBasket className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                1-Click Trip to Pantry Restocking
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                When you finish shopping, complete your trip with a single tap to automatically transition bought
                groceries into your pantry inventory—no manual barcode scanning or spreadsheet tracking needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog Teaser */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              Explore 1,000+ UK Supermarket Products
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              Real UK prices, barcodes, and nutritional categories from OpenFoodFacts.
            </p>
          </div>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F1F8E9] text-[#689F38] text-xs font-bold hover:bg-[#84C225] hover:text-white transition-all self-start sm:self-auto"
          >
            <span>View Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/catalogue?category=${encodeURIComponent(cat.query)}`}
              className="p-3.5 rounded-2xl bg-gray-50 hover:bg-[#F1F8E9] border border-gray-100 hover:border-[#C5E1A5] text-center transition-all group"
            >
              <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="text-xs font-bold text-gray-700 group-hover:text-[#689F38]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Call to Action Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-4">
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
          Ready to save hundreds on your grocery bill?
        </h3>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-lg mx-auto leading-relaxed">
          Start planning with real-time bill forecasting, smart expiry alerts, and zero-waste chef recipes today.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="px-6 py-3.5 rounded-2xl bg-[#84C225] hover:bg-[#689F38] text-white text-xs sm:text-sm font-black shadow-md transition-all cursor-pointer"
            >
              Create Free Account
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button
              type="button"
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Authenticated User Dashboard
 * Rendered when the user is signed in through Clerk.
 */
function DashboardView() {
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
      if (activeCandidate) {
        setActiveListId(activeCandidate.id);
        const map: Record<string, number> = {};
        let total = 0;
        activeCandidate.items?.forEach((item) => {
          map[item.productId] = Number(item.quantity) || 1;
          const price = Number(item.product?.defaultUnitPrice || 1.99);
          total += price * (Number(item.quantity) || 1);
        });
        setAddedMap(map);
        setStats({
          activeListCount: activeCandidate.items?.length || 0,
          estimatedTotal: Number(total.toFixed(2)),
          budget: Number(activeCandidate.budget || profileBudget || 75),
        });
      } else {
        setStats({
          activeListCount: 0,
          estimatedTotal: 0,
          budget: profileBudget || 75,
        });
      }
    } catch {
      // Graceful fallback
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
      let targetListId = activeListId;

      if (!targetListId) {
        const newRes = await api.createShoppingList("Weekly Groceries", 75, "GBP");
        targetListId = newRes.data.id;
        setActiveListId(targetListId);
      }

      await api.addItemToList(targetListId, item.productId, 1);
      setAddedMap((prev) => ({ ...prev, [item.productId]: (prev[item.productId] || 0) + 1 }));
      setStats((prev) => ({
        ...prev,
        activeListCount: prev.activeListCount + 1,
        estimatedTotal: Number((prev.estimatedTotal + (item.defaultUnitPrice || 1.99)).toFixed(2)),
      }));
    } catch {
      // Ignored
    } finally {
      setAddingId(null);
    }
  };

  const getDaysLeft = (expiryDate: string | null) => {
    if (!expiryDate) return 99;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Stats Banner */}
      <div className="bg-gradient-to-r from-[#84C225] to-[#689F38] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Smart Replenishment Active
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Household Grocery Overview
            </h1>
            <p className="text-xs sm:text-sm text-white/90">
              Live bill forecasting, pantry expiry alerts, and zero-waste chef recommendations.
            </p>
          </div>

          <Link
            href="/lists"
            className="bg-white text-gray-900 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <ShoppingBasket className="w-4 h-4 text-[#84C225]" />
            <span>View Active List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live Bill Predictor Widget */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-white/80 block">Active List Items</span>
            <span className="text-xl sm:text-2xl font-black mt-0.5 block">{stats.activeListCount}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-white/80 block">Estimated Bill Total</span>
            <span className="text-xl sm:text-2xl font-black mt-0.5 block">£{stats.estimatedTotal.toFixed(2)}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/80">Weekly Budget</span>
              <span className="text-[10px] font-bold text-green-100">£{stats.budget.toFixed(2)}</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.estimatedTotal > stats.budget ? "bg-red-400" : "bg-white"
                }`}
                style={{
                  width: `${Math.min(100, (stats.estimatedTotal / (stats.budget || 75)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Category Jump */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#84C225]" /> UK Supermarket Categories
          </h3>
          <Link
            href="/catalogue"
            className="text-xs font-bold text-[#689F38] hover:underline flex items-center gap-1"
          >
            <span>All 1,000+ Items</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/catalogue?category=${encodeURIComponent(cat.query)}`}
              className="bg-white hover:bg-[#F1F8E9] p-3 rounded-2xl border border-gray-100 hover:border-[#C5E1A5] shadow-2xs transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-xs font-bold text-gray-700 group-hover:text-[#689F38]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Expiring Pantry Warnings */}
      {expiringItems.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Pantry Expiry Radar — Spoilage Risk</span>
            </div>
            <Link href="/ai" className="text-xs font-bold text-amber-800 hover:underline">
              Cook with Chef AI →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {expiringItems.slice(0, 3).map((item) => {
              const days = getDaysLeft(item.expiryDate);
              const isUrgent = days <= 2;
              return (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-2xl border border-amber-100 flex items-center justify-between shadow-2xs"
                >
                  <div className="truncate mr-2">
                    <span className="text-xs font-bold text-gray-900 block truncate">
                      {item.product?.name || "Grocery Item"}
                    </span>
                    <span className="text-[10px] text-gray-400">Qty: {item.quantity}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isUrgent
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {days <= 0 ? "EXPIRED" : `${days}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Replenishment Radar Recommendations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#84C225]" /> AI Replenishment Radar
          </h3>
          <span className="text-xs text-gray-500 font-medium">Predicted consumption velocity</span>
        </div>

        {replenishments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {replenishments.map((item) => {
              const isAdded = (addedMap[item.productId] || 0) > 0;
              return (
                <div
                  key={item.productId}
                  className="bg-white rounded-3xl p-4 shadow-2xs border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {item.category || "Grocery"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F1F8E9] text-[#689F38]">
                        Re-stock in {item.estimatedDaysUntilDepleted || 3}d
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">
                      {item.productName}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2">
                      {item.reason || "Frequently replenished household staple"}
                    </p>
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

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#84C225] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-bold text-gray-500">Loading SmartGrocer...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return <DashboardView />;
}
