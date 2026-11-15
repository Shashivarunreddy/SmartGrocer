"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Users, PoundSterling, Utensils, Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

const DIETARY_OPTIONS = [
  { label: "Vegetarian", icon: "🌿" },
  { label: "Vegan", icon: "🌱" },
  { label: "Eggetarian", icon: "🥚" },
  { label: "Gluten-Free", icon: "🌾" },
  { label: "Dairy-Free", icon: "🥛" },
  { label: "Nut Allergy", icon: "🥜" },
  { label: "Halal", icon: "☪️" },
  { label: "Kosher", icon: "✡️" },
];

export function OnboardingModal() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [customHousehold, setCustomHousehold] = useState<string>("2");
  const [defaultBudget, setDefaultBudget] = useState<number>(75);
  const [customBudget, setCustomBudget] = useState<string>("75");
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsOpen(false);
      return;
    }

    // Check if the user profile already has household size and budget
    let isMounted = true;
    api
      .getProfile()
      .then((res) => {
        if (!isMounted) return;
        const profile = res.data;
        const needsOnboarding =
          !profile ||
          profile.isOnboarded === false ||
          !profile.defaultBudget ||
          Number(profile.defaultBudget) <= 0 ||
          !profile.householdSize ||
          Number(profile.householdSize) <= 0;

        if (needsOnboarding) {
          if (profile?.householdSize) {
            setHouseholdSize(Number(profile.householdSize));
            setCustomHousehold(String(profile.householdSize));
          }
          if (profile?.defaultBudget) {
            setDefaultBudget(Number(profile.defaultBudget));
            setCustomBudget(String(profile.defaultBudget));
          }
          if (Array.isArray(profile?.dietaryPreferences)) {
            setSelectedDiet(profile.dietaryPreferences);
          }
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      })
      .catch(() => {
        // Unauthenticated or profile fetch failed
      });

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  if (!isOpen) return null;

  const toggleDiet = (pref: string) => {
    setSelectedDiet((prev) =>
      prev.includes(pref) ? prev.filter((d) => d !== pref) : [...prev, pref]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalHousehold = parseInt(customHousehold, 10) || householdSize || 2;
    const finalBudget = parseFloat(customBudget) || defaultBudget || 75;

    if (finalHousehold < 1) {
      setError("Please enter a valid household size (at least 1 person).");
      return;
    }
    if (finalBudget < 5) {
      setError("Please enter a realistic target weekly budget (at least £5).");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.updateProfile({
        householdSize: finalHousehold,
        defaultBudget: finalBudget,
        currency: "GBP",
        dietaryPreferences: selectedDiet,
        isOnboarded: true,
      });

      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F8E9] text-[#689F38] border border-[#C5E1A5] flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7 text-[#84C225]" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Welcome to SmartGrocer! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-sm mx-auto">
            Please complete your household and target budget setup to activate smart recommendations & budget tracking.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Step 1: Household Size */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Users className="w-4 h-4 text-[#84C225]" />
              <span>Household Size (Required)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setHouseholdSize(size);
                    setCustomHousehold(String(size));
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    parseInt(customHousehold, 10) === size
                      ? "bg-[#84C225] text-white border-[#84C225] shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {size} {size === 1 ? "Person" : "People"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-400 font-medium">Or enter exact:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={customHousehold}
                onChange={(e) => setCustomHousehold(e.target.value)}
                className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:border-[#84C225]"
              />
            </div>
          </div>

          {/* Step 2: Weekly Budget */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <PoundSterling className="w-4 h-4 text-[#84C225]" />
              <span>Target Weekly Budget (Required)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[40, 60, 75, 100].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setDefaultBudget(b);
                    setCustomBudget(String(b));
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    parseFloat(customBudget) === b
                      ? "bg-[#84C225] text-white border-[#84C225] shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  £{b}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                £
              </span>
              <input
                type="number"
                step="1"
                min="5"
                placeholder="Enter custom budget"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-[#84C225]"
                required
              />
            </div>
          </div>

          {/* Step 3: Dietary Preferences */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Utensils className="w-4 h-4 text-[#84C225]" />
              <span>Dietary Preferences (Optional)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = selectedDiet.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => toggleDiet(opt.label)}
                    className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-[#F1F8E9] border-[#84C225] text-[#2E7D32]"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#84C225] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-[#84C225] hover:bg-[#689F38] text-white shadow-sm shadow-green-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Setup & Start Shopping</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#84C225]" />
            <span>You can update these anytime in your Profile</span>
          </div>
        </form>
      </div>
    </div>
  );
}

