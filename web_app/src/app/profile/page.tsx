"use client";

import React, { useState, useEffect } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  User,
  Settings,
  BarChart3,
  LogOut,
  ShieldCheck,
  Check,
  Save,
  PoundSterling,
  Users,
  Utensils,
  TrendingDown,
  ShoppingBag,
} from "lucide-react";
import { api, AnalyticsSummary } from "@/lib/api";

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Eggetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Nut Allergy",
  "Halal",
  "Kosher",
];

export default function ProfilePage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"settings" | "analytics">("settings");

  // Profile Form States
  const [householdSize, setHouseholdSize] = useState("2");
  const [defaultBudget, setDefaultBudget] = useState("75");
  const [currency, setCurrency] = useState("GBP");
  const [selectedDiet, setSelectedDiet] = useState<string[]>(["Vegetarian"]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Analytics States
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // Load profile
    api
      .getProfile()
      .then((res) => {
        if (res.data) {
          if (res.data.householdSize) setHouseholdSize(res.data.householdSize.toString());
          if (res.data.defaultBudget) setDefaultBudget(res.data.defaultBudget.toString());
          if (res.data.currency) setCurrency(res.data.currency);
          if (res.data.dietaryPreferences) setSelectedDiet(res.data.dietaryPreferences);
        }
      })
      .catch(() => {});

    // Load analytics
    setLoadingAnalytics(true);
    api
      .getAnalyticsSummary()
      .then((res) => {
        if (res.data) setAnalytics(res.data);
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoadingAnalytics(false));
  }, []);

  const toggleDiet = (opt: string) => {
    setSelectedDiet((prev) =>
      prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt]
    );
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.updateProfile({
        householdSize: parseInt(householdSize, 10) || 2,
        defaultBudget: parseFloat(defaultBudget) || 75,
        currency,
        dietaryPreferences: selectedDiet,
      });
      showToast("✓ Profile settings saved!");
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#166534] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#84C225] text-white flex items-center justify-center font-black text-2xl shadow-sm shadow-green-600/20">
            {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "SmartGrocer User"}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#689F38] mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Clerk Authenticated
            </span>
          </div>
        </div>

        <SignOutButton>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </SignOutButton>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-2xs max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-[#84C225] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "analytics"
              ? "bg-[#84C225] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
            Household & Budget Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Household Size */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#84C225]" />
                <span>Household Size (People)</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225] text-gray-900"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Calibrates Gemini recipe portions and replenishment frequency.
              </span>
            </div>

            {/* Target Weekly Budget */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <PoundSterling className="w-4 h-4 text-[#84C225]" />
                <span>Default Weekly Budget (£)</span>
              </label>
              <input
                type="number"
                min="10"
                step="5"
                value={defaultBudget}
                onChange={(e) => setDefaultBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225] text-gray-900 font-bold"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Synchronized across bill predictors and over-budget warnings.
              </span>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-[#84C225]" />
              <span>Dietary Requirements & Allergies</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = selectedDiet.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleDiet(opt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#84C225] text-white shadow-2xs"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveProfile}
            className="w-full py-3 bg-[#84C225] hover:bg-[#689F38] text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors shadow-sm shadow-green-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Preferences"}</span>
          </button>
        </div>
      )}

      {/* TAB 2: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {analytics ? (
            <div className="space-y-4">
              {/* Spending Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-400 block">Lifetime Spend</span>
                  <span className="text-lg font-black text-gray-900 block mt-1">
                    £{Number(analytics.spending?.lifetimeSpendGbp || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-400 block">This Month</span>
                  <span className="text-lg font-black text-gray-900 block mt-1">
                    £{Number(analytics.spending?.thisMonthSpendGbp || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-400 block">Budget Adherence</span>
                  <span className="text-lg font-black text-[#84C225] block mt-1">
                    {Math.round(analytics.spending?.budgetAdherenceRate || 85)}%
                  </span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-400 block">Waste Avoidance</span>
                  <span className="text-lg font-black text-emerald-700 block mt-1">
                    {Math.round(analytics.foodWaste?.wasteAvoidanceRate || 92)}%
                  </span>
                </div>
              </div>

              {/* Category Spend Distribution */}
              {analytics.spending?.categoryDistribution &&
                analytics.spending.categoryDistribution.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 mb-4">
                      Category Spend Breakdown
                    </h4>
                    <div className="space-y-3">
                      {analytics.spending.categoryDistribution.map((cat, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-gray-800">{cat.category}</span>
                            <span className="text-gray-900 font-bold">
                              £{cat.totalGbp.toFixed(2)} ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#84C225] rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
              <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-gray-800">No analytics data yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                Complete your first shopping trip or log pantry use to see your spending insights.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
