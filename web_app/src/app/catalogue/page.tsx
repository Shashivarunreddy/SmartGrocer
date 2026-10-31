"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Check,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { api, Product, ShoppingList } from "@/lib/api";

const CATEGORIES = [
  "All",
  "Fresh Produce",
  "Dairy & Eggs",
  "Bakery",
  "Meat & Poultry",
  "Beverages",
  "Snacks & Biscuits",
  "Pantry Staples",
];

function CatalogueContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedMap, setAddedMap] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadActiveList = async () => {
    try {
      const res = await api.getShoppingLists();
      const list = res.data?.find((l) => l.status === "ACTIVE" || l.status === "DRAFT");
      if (list) {
        setActiveList(list);
        const map: Record<string, number> = {};
        list.items?.forEach((i) => {
          map[i.productId] = Number(i.quantity) || 1;
        });
        setAddedMap(map);
      }
    } catch (err) {
      console.error("Failed to load active list:", err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
      });

      setProducts(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory]);

  useEffect(() => {
    loadActiveList();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToList = async (product: Product) => {
    try {
      setAddingId(product.id);
      const currentQty = addedMap[product.id] || 0;
      setAddedMap((prev) => ({ ...prev, [product.id]: currentQty + 1 }));

      let list = activeList;
      if (!list) {
        const createRes = await api.createShoppingList("My Smart List", 75, "GBP");
        list = createRes.data;
        setActiveList(list);
      }

      await api.addItemToList(list.id, product.id, 1);
      showToast(`✓ Added ${product.name} to list`);
    } catch {
      setAddedMap((prev) => {
        const copy = { ...prev };
        if (copy[product.id] <= 1) delete copy[product.id];
        else copy[product.id] -= 1;
        return copy;
      });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            UK Product Catalogue
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {totalCount > 0 ? `${totalCount} products available across UK supermarkets` : "Explore fresh groceries"}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search milk, bread, chicken..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84C225] focus:border-transparent text-gray-800 shadow-2xs"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setSelectedCategory(cat);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-[#84C225] text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#166534] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-gray-100 animate-pulse h-64" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => {
            const addedCount = addedMap[product.id] || 0;
            const isAdding = addingId === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-3.5 sm:p-4 border border-gray-100 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all group"
              >
                <div>
                  {/* Product Image / Category Icon Placeholder */}
                  <div className="w-full h-32 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden mb-3 border border-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Hide image and fall back if broken
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ShoppingBasket className="w-10 h-10 text-gray-300" />
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-[#689F38] uppercase tracking-wider block">
                    {product.category || "Grocery"}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5">
                    {product.name}
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium block mt-1">
                    {product.productQuantity > 0 ? `${product.productQuantity} ${product.unit}` : product.unit || "unit"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-sm sm:text-base font-black text-gray-900">
                    £{Number(product.defaultUnitPrice).toFixed(2)}
                  </span>

                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleAddToList(product)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      addedCount > 0
                        ? "bg-[#F1F8E9] text-[#689F38] border border-[#C5E1A5] hover:bg-[#84C225] hover:text-white"
                        : "bg-[#84C225] hover:bg-[#689F38] text-white shadow-2xs"
                    }`}
                  >
                    {addedCount > 0 ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{addedCount} in list</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-gray-800">No products found</h3>
          <p className="text-xs text-gray-500 mt-1">
            Try adjusting your search query or selecting a different category.
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading catalogue...</div>}>
      <CatalogueContent />
    </Suspense>
  );
}

