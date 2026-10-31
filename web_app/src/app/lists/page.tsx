"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  TrendingDown,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Calculator,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import {
  api,
  ShoppingList,
  ListItem,
  AlternativeItem,
  BillEstimate,
} from "@/lib/api";

export default function ListsPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [estimate, setEstimate] = useState<BillEstimate | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [updatePantryOnComplete, setUpdatePantryOnComplete] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getShoppingLists();
      const allLists = res.data || [];
      setLists(allLists);

      const active = allLists.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");
      if (active) {
        setActiveList(active);
        // Estimate and alternatives
        const [estRes, altRes] = await Promise.allSettled([
          api.estimateBill(active.id).catch(() => null),
          api.getAlternatives(active.id).catch(() => null),
        ]);

        if (estRes.status === "fulfilled" && estRes.value?.data) {
          setEstimate(estRes.value.data);
        }
        if (altRes.status === "fulfilled" && altRes.value?.data?.substitutions) {
          setAlternatives(altRes.value.data.substitutions);
        }
      } else {
        setActiveList(null);
        setEstimate(null);
        setAlternatives([]);
      }
    } catch (err) {
      console.error("Failed to load lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePurchased = async (item: ListItem) => {
    if (!activeList) return;
    try {
      const nextStatus = !item.isPurchased;
      setActiveList((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, isPurchased: nextStatus } : i
          ),
        };
      });

      await api.updateListItem(activeList.id, item.id, { isPurchased: nextStatus });
    } catch (err) {
      console.error("Failed to toggle item:", err);
      loadData();
    }
  };

  const handleUpdateQuantity = async (item: ListItem, delta: number) => {
    if (!activeList) return;
    const nextQty = Math.max(1, Number(item.quantity) + delta);
    try {
      setActiveList((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, quantity: nextQty } : i
          ),
        };
      });

      await api.updateListItem(activeList.id, item.id, { quantity: nextQty });
      api.estimateBill(activeList.id).then((res) => setEstimate(res.data)).catch(() => {});
    } catch (err) {
      console.error("Failed to update qty:", err);
      loadData();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeList) return;
    try {
      setActiveList((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.filter((i) => i.id !== itemId),
        };
      });

      await api.deleteListItem(activeList.id, itemId);
      showToast("Item removed");
      api.estimateBill(activeList.id).then((res) => setEstimate(res.data)).catch(() => {});
    } catch (err) {
      console.error("Failed to delete item:", err);
      loadData();
    }
  };

  const handleApplyAlternative = async (alt: AlternativeItem) => {
    if (!activeList) return;
    try {
      // Find original item in list
      const orig = activeList.items.find((i) => i.productId === alt.originalProductId);
      if (orig) {
        await api.deleteListItem(activeList.id, orig.id);
      }
      await api.addItemToList(activeList.id, alt.suggestedProductId, 1);
      showToast(`Swapped for ${alt.suggestedProductName} (Saved £${alt.estimatedSavings.toFixed(2)})`);
      loadData();
    } catch (err) {
      console.error("Failed to apply alternative:", err);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeList || activeList.items.length === 0) return;
    try {
      setCompleting(true);
      await api.recordShoppingTrip({
        shoppingListId: activeList.id,
        updatePantry: updatePantryOnComplete,
        notes: `Completed shopping trip on ${new Date().toLocaleDateString("en-GB")}`,
        items: activeList.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.product?.defaultUnitPrice || 1.99),
        })),
      });

      showToast("🎉 Shopping run completed and added to pantry!");
      setShowCompleteModal(false);
      loadData();
    } catch (err: any) {
      alert("Failed to complete trip: " + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const items = activeList?.items || [];
  const calculatedSubtotal = items.reduce(
    (sum, i) => sum + (Number(i.product?.defaultUnitPrice) || 0) * (Number(i.quantity) || 1),
    0
  );
  const targetBudget = activeList?.budget ? Number(activeList.budget) : 75;
  const isOverBudget = calculatedSubtotal > targetBudget;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#166534] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Active Shopping List
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Check off items in supermarket aisles and track live estimated spending.
          </p>
        </div>

        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white font-bold text-xs shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add More Products</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 animate-pulse h-64" />
      ) : activeList && items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {items.length} {items.length === 1 ? "Item" : "Items"} in Cart
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {items.filter((i) => i.isPurchased).length} purchased
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-50">
                {items.map((item) => {
                  const unitPrice = Number(item.product?.defaultUnitPrice || 1.99);
                  const lineTotal = unitPrice * Number(item.quantity);

                  return (
                    <div
                      key={item.id}
                      className={`py-3.5 flex items-center justify-between gap-3 transition-opacity ${
                        item.isPurchased ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      {/* Checkbox & Product Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePurchased(item)}
                          className="text-[#84C225] hover:text-[#689F38] cursor-pointer shrink-0"
                        >
                          {item.isPurchased ? (
                            <CheckCircle2 className="w-5 h-5 fill-emerald-100 text-[#84C225]" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <h4
                            className={`text-xs sm:text-sm font-bold text-gray-900 truncate ${
                              item.isPurchased ? "line-through text-gray-400" : ""
                            }`}
                          >
                            {item.product?.name || "Product"}
                          </h4>
                          <span className="text-[11px] text-gray-400 font-medium">
                            £{unitPrice.toFixed(2)} each • {item.product?.category || "Pantry"}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controller & Price */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item, -1)}
                            className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item, 1)}
                            className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-xs sm:text-sm font-black text-gray-900 w-16 text-right">
                          £{lineTotal.toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Alternatives Card */}
            {alternatives.length > 0 && (
              <div className="bg-[#F1F8E9] border border-[#C5E1A5] rounded-3xl p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#84C225]" />
                  <h3 className="text-xs sm:text-sm font-black text-[#689F38] uppercase tracking-wider">
                    Swap & Save with Cheaper Alternatives
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-2xl border border-green-100 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-gray-400 line-through block">
                          {alt.originalProductName} (£{Number(alt.originalPrice).toFixed(2)})
                        </span>
                        <span className="text-xs font-bold text-gray-900 block truncate">
                          {alt.suggestedProductName} (£{Number(alt.suggestedPrice).toFixed(2)})
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          Save £{Number(alt.estimatedSavings).toFixed(2)} • {alt.reason}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyAlternative(alt)}
                        className="px-3 py-1.5 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                      >
                        Swap
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Summary Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#84C225]" />
                <span>Live Bill Predictor</span>
              </h3>

              <div className="space-y-2 text-xs font-semibold text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-gray-900 font-bold">£{calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weekly Budget</span>
                  <span className="text-gray-900 font-bold">£{targetBudget.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                  <span className="font-bold text-gray-800">Estimated Total</span>
                  <span className="font-black text-[#84C225] text-base">
                    £{calculatedSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Budget Warning / Adherence */}
              {isOverBudget ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Exceeds weekly budget by £{(calculatedSubtotal - targetBudget).toFixed(2)}</span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Within budget (£{(targetBudget - calculatedSubtotal).toFixed(2)} left)</span>
                </div>
              )}

              {/* Complete Shopping Run Button */}
              <button
                type="button"
                onClick={() => setShowCompleteModal(true)}
                className="w-full py-3.5 bg-[#84C225] hover:bg-[#689F38] text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm shadow-green-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Complete Shopping Run</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 max-w-md mx-auto">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Your shopping list is empty</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Browse our 1,000 UK catalogue products or ask Chef Gemini to add recipe ingredients.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 rounded-xl bg-[#84C225] text-white text-xs font-bold shadow-xs hover:bg-[#689F38] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Browse Catalogue</span>
          </Link>
        </div>
      )}

      {/* Complete Shopping Run Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Finish Shopping Run</h3>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              This will record your actual total of{" "}
              <span className="font-bold text-gray-900">£{calculatedSubtotal.toFixed(2)}</span> into your
              analytics history and mark this list completed.
            </p>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={updatePantryOnComplete}
                onChange={(e) => setUpdatePantryOnComplete(e.target.checked)}
                className="w-4 h-4 text-[#84C225] rounded accent-[#84C225]"
              />
              <span className="text-xs font-bold text-gray-800">
                Automatically add these items to my Pantry
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={handleCompleteTrip}
                className="flex-1 py-2.5 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {completing ? "Saving..." : "Confirm & Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
