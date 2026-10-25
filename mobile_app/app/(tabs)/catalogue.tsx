import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { api, Product } from '@/services/api';

const CATEGORIES = [
  'All',
  'Groceries',
  'Dairies',
  'Beverages',
  'Snacks',
  'Breakfast',
  'Spreads',
  'Breads',
];

export default function CatalogueScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [basketCounts, setBasketCounts] = useState<Record<string, number>>({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        pageSize: 50,
        search: search.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });
      setProducts(res.data || []);
    } catch (err: any) {
      console.log('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncBasket = async () => {
    try {
      const res = await api.getShoppingLists();
      if (res.data && res.data.length > 0) {
        const first = res.data[0];
        setActiveListId(first.id);
        const map: Record<string, number> = {};
        for (const item of first.items || []) {
          map[item.productId] = Number(item.quantity) || 1;
        }
        setBasketCounts(map);
      }
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      syncBasket();
    }, [])
  );

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory]);

  const handleAddToList = async (product: Product) => {
    try {
      setAddingId(product.id);
      // Instant optimistic UI feedback: increment count without waiting for network
      setBasketCounts((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] || 0) + 1,
      }));

      let listId = activeListId;
      if (!listId) {
        const res = await api.getShoppingLists();
        if (res.data && res.data.length > 0) {
          listId = res.data[0].id;
          setActiveListId(listId);
        } else {
          const newList = await api.createShoppingList('My Weekly Grocery', 75, 'GBP');
          listId = newList.data.id;
          setActiveListId(listId);
        }
      }

      await api.addItemToList(listId, product.id, 1);
    } catch {
      // Revert count if network error
      setBasketCounts((prev) => {
        const copy = { ...prev };
        if ((copy[product.id] || 0) <= 1) delete copy[product.id];
        else copy[product.id] -= 1;
        return copy;
      });
    } finally {
      setAddingId(null);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isAdding = addingId === item.id;
    const count = basketCounts[item.id] || 0;

    return (
      <View style={styles.productCard}>
        {/* Veg Symbol Badge & In-List Indicator */}
        <View style={styles.topCardRow}>
          <View style={styles.vegBadgeSquare}>
            <View style={styles.vegBadgeCircle} />
          </View>
          {count > 0 ? (
            <View style={styles.inListBadge}>
              <Ionicons name="checkmark-circle" size={11} color="#166534" />
              <Text style={styles.inListBadgeText}>{count} in list</Text>
            </View>
          ) : item.categoriesTags && item.categoriesTags.length > 0 ? (
            <Text style={styles.categoryBadge} numberOfLines={1}>
              {item.category || 'Grocery'}
            </Text>
          ) : null}
        </View>

        {/* Thumbnail Product Image */}
        <View style={styles.thumbnailWrapper}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.thumbnailImg}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="basket" size={36} color={BrandColors.primary} />
          )}
        </View>

        {/* Details */}
        <View style={styles.productBody}>
          <Text style={styles.brandName} numberOfLines={1}>
            {item.brands || 'SmartGrocer Select'}
          </Text>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.unitText}>{item.unit || '1 unit'}</Text>
        </View>

        {/* Bottom Price and Add Action */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceSymbol}>
              £<Text style={styles.priceNum}>{Number(item.defaultUnitPrice).toFixed(2)}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              count > 0 && styles.addBtnInList,
              isAdding && styles.addBtnDisabled,
            ]}
            disabled={isAdding}
            onPress={() => handleAddToList(item)}>
            {isAdding ? (
              <ActivityIndicator size="small" color={count > 0 ? '#FFFFFF' : '#689F38'} />
            ) : count > 0 ? (
              <View style={styles.inListBtnContent}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.addBtnTextInList}>{count}</Text>
              </View>
            ) : (
              <Text style={styles.addBtnText}>+ ADD</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search 100+ grocery items, brands..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(item)}>
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Loading fresh items...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="basket-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySub}>Try searching with a different keyword or category.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : `prod-${index}`)}
          numColumns={2}
          contentContainerStyle={styles.productsGrid}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderProductItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#84C225',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  productsGrid: {
    padding: 12,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vegBadgeSquare: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBadgeCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  categoryBadge: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inListBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inListBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  thumbnailWrapper: {
    height: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  productBody: {
    flex: 1,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
    minHeight: 36,
  },
  unitText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceSymbol: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  priceNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#84C225',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 54,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnInList: {
    backgroundColor: '#84C225',
    borderColor: '#689F38',
  },
  inListBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addBtnTextInList: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#689F38',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
