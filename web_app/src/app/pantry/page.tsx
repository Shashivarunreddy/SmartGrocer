"use client";

import React, { useState, useEffect } from "react";
import {
  Refrigerator,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Utensils,
  CheckCircle2,
  X,
  Search,
  Check,
} from "lucide-react";
import { api, PantryItem, Product } from "@/lib/api";

type FilterMode = "ALL" | "EXPIRING" | "FRESH";

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("ALL");

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addExpiry, setAddExpiry] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Log Consumption Modal
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [activeItemToConsume, setActiveItemToConsume] = useState<PantryItem | null>(null);
  const [consumedQty, setConsumedQty] = useState(1);
  const [wastedQty, setWastedQty] = useState(0);
  const [wasteReason, setWasteReason] = useState("Expired before use");
  const [savingConsume, setSavingConsume] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadPantry = async () => {
    try {
      setLoading(true);
      const res = await api.getPantryItems();
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load pantry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPantry();
  }, []);

  // Live search for add item
  useEffect(() => {
    if (!catalogueSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.getProducts({ search: catalogueSearch, pageSize: 5 });
        setSearchResults(res.data || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [catalogueSearch]);

  const getDaysLeft = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const diffMs = new Date(expiryDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (days: number | null) => {
    if (days === null) return { text: "No Expiry", color: "bg-gray-100 text-gray-600" };
    if (days <= 2) return { text: days <= 0 ? "Expired" : `${days}d left!`, color: "bg-red-50 text-red-700 border border-red-200" };
    if (days <= 5) return { text: `${days}d left`, color: "bg-amber-50 text-amber-700 border border-amber-200" };
    return { text: `${days}d left`, color: "bg-emerald-50 text-emerald-700" };
  };

  const filteredItems = items.filter((item) => {
    const days = getDaysLeft(item.expiryDate);
    if (filter === "EXPIRING") return days !== null && days <= 5;
    if (filter === "FRESH") return days === null || days > 5;
    return true;
  });

  const handleSaveNewItem = async () => {
    if (!selectedProduct) return;
    try {
      setSavingAdd(true);
      await api.addPantryItem(
        selectedProduct.id,
        addQuantity,
        selectedProduct.unit || "unit",
        addExpiry || undefined
      );
      showToast(`✓ Added ${selectedProduct.name} to pantry`);
      setShowAddModal(false);
      setSelectedProduct(null);
      setCatalogueSearch("");
      setAddQuantity(1);
      setAddExpiry("");
      loadPantry();
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    } finally {
      setSavingAdd(false);
    }
  };

  const handleSaveConsumption = async () => {
    if (!activeItemToConsume) return;
    try {
      setSavingConsume(true);
      await api.logConsumption({
        productId: activeItemToConsume.productId,
        pantryItemId: activeItemToConsume.id,
        quantityConsumed: consumedQty,
        quantityWasted: wastedQty,
        reason: wastedQty > 0 ? wasteReason : "Consumed normally",
      });

      showToast("✓ Consumption recorded!");
      setShowConsumeModal(false);
      setActiveItemToConsume(null);
      loadPantry();
    } catch (err: any) {
      alert("Error recording consumption: " + err.message);
    } finally {
      setSavingConsume(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      await api.deletePantryItem(itemId);
      showToast("Item deleted from pantry");
    } catch (err) {
      loadPantry();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Pantry Inventory
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Monitor freshness, prevent waste, and feed ingredients into Chef Gemini recipes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#84C225] hover:bg-[#689F38] text-white font-bold text-xs shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Pantry Item</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-2">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === "ALL"
              ? "bg-[#84C225] text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          All Items ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("EXPIRING")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === "EXPIRING"
              ? "bg-amber-500 text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          Expiring Soon (
          {items.filter((i) => {
            const d = getDaysLeft(i.expiryDate);
            return d !== null && d <= 5;
          }).length}
          )
        </button>
        <button
          type="button"
          onClick={() => setFilter("FRESH")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === "FRESH"
              ? "bg-[#84C225] text-white shadow-xs"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          Fresh
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-gray-100 animate-pulse h-36" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const daysLeft = getDaysLeft(item.expiryDate);
            const badge = getStatusBadge(daysLeft);

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.text}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">
                      Qty: {Number(item.quantity)} {item.unit || "unit"}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-gray-900 leading-tight">
                    {item.product?.name || "Pantry Item"}
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
                    {item.product?.category || "Kitchen"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveItemToConsume(item);
                      setConsumedQty(Number(item.quantity));
                      setWastedQty(0);
                      setShowConsumeModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F8E9] hover:bg-[#84C225] hover:text-white text-[#689F38] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Log Use / Waste</span>
                  </button>

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
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 max-w-md mx-auto">
          <Refrigerator className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-gray-900">No pantry items found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {filter === "EXPIRING"
              ? "Great job! None of your pantry items are nearing expiration."
              : "Add groceries to track shelf-life and generate zero-waste recipes."}
          </p>
        </div>
      )}

      {/* Add Pantry Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Add to Pantry</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Search Product</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search 1,000 UK catalogue items..."
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && !selectedProduct && (
                <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setCatalogueSearch(p.name);
                        setSearchResults([]);
                      }}
                      className="w-full p-2.5 text-left text-xs hover:bg-[#F1F8E9] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-bold text-gray-800 truncate">{p.name}</span>
                      <span className="text-gray-400 font-semibold shrink-0">£{Number(p.defaultUnitPrice).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">{selectedProduct.name}</span>
                  <span className="text-[11px] text-emerald-700 font-medium">£{Number(selectedProduct.defaultUnitPrice).toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setCatalogueSearch("");
                  }}
                  className="text-emerald-700 text-xs font-bold hover:underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={addExpiry}
                  onChange={(e) => setAddExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!selectedProduct || savingAdd}
              onClick={handleSaveNewItem}
              className="w-full py-2.5 bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
            >
              {savingAdd ? "Saving..." : "Add to Inventory"}
            </button>
          </div>
        </div>
      )}

      {/* Log Consumption Modal */}
      {showConsumeModal && activeItemToConsume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Log Use or Waste</h3>
              <button
                type="button"
                onClick={() => setShowConsumeModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Logging what you ate vs wasted helps SmartGrocer calculate your waste prevention rate and optimize future purchases.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Consumed Qty</label>
                <input
                  type="number"
                  min="0"
                  value={consumedQty}
                  onChange={(e) => setConsumedQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Wasted Qty</label>
                <input
                  type="number"
                  min="0"
                  value={wastedQty}
                  onChange={(e) => setWastedQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225]"
                />
              </div>
            </div>

            {wastedQty > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Waste</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225] bg-white"
                >
                  <option>Expired before use</option>
                  <option>Spoiled in fridge</option>
                  <option>Cooked too much / leftovers</option>
                  <option>Poor quality / damaged</option>
                </select>
              </div>
            )}

            <button
              type="button"
              disabled={savingConsume}
              onClick={handleSaveConsumption}
              className="w-full py-2.5 bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
            >
              {savingConsume ? "Saving..." : "Record & Update Stock"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

