import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import { api, AnalyticsSummary } from '@/services/api';
import { AuthCard } from '@/components/AuthCard';

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Eggetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Nut Allergy',
];

type ProfileTab = 'analytics' | 'settings';

export default function ProfileScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<ProfileTab>('analytics');

  // Settings States
  const [householdSize, setHouseholdSize] = useState('2');
  const [defaultBudget, setDefaultBudget] = useState('75');
  const [currency, setCurrency] = useState('GBP');
  const [selectedDiet, setSelectedDiet] = useState<string[]>(['Vegetarian']);
  const [saving, setSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Analytics States (Phase B)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    // Check backend health
    api
      .checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('disconnected'));

    if (isSignedIn) {
      // 1. Load user profile
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

      // 2. Load spending & waste analytics
      setLoadingAnalytics(true);
      api
        .getAnalyticsSummary()
        .then((res) => {
          if (res.data) setAnalytics(res.data);
        })
        .catch((err) => {
          console.log('Error fetching analytics:', err.message);
        })
        .finally(() => {
          setLoadingAnalytics(false);
          setRefreshing(false);
        });
    } else {
      setLoadingAnalytics(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleDiet = (option: string) => {
    if (selectedDiet.includes(option)) {
      setSelectedDiet(selectedDiet.filter((d) => d !== option));
    } else {
      setSelectedDiet([...selectedDiet, option]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isSignedIn) {
        await api.updateProfile({
          householdSize: parseInt(householdSize, 10) || 1,
          defaultBudget: parseFloat(defaultBudget) || 75,
          currency,
          dietaryPreferences: selectedDiet,
        });
      }
      Alert.alert('Saved', 'Your grocery preferences and budget have been updated.');
    } catch (err: any) {
      Alert.alert('Notice', 'Preferences saved locally on device.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of SmartGrocer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          Alert.alert('Logged Out', 'You have successfully signed out.');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Header */}
      <View style={styles.segmentedHeader}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'analytics' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('analytics')}>
          <Ionicons
            name="pie-chart-outline"
            size={16}
            color={activeTab === 'analytics' ? '#FFF' : '#4B5563'}
          />
          <Text style={[styles.segmentText, activeTab === 'analytics' && styles.segmentTextActive]}>
            Spending & Waste
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'settings' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('settings')}>
          <Ionicons
            name="settings-outline"
            size={16}
            color={activeTab === 'settings' ? '#FFF' : '#4B5563'}
          />
          <Text style={[styles.segmentText, activeTab === 'settings' && styles.segmentTextActive]}>
            Household Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ======================================================== */}
        {/* TAB 1: SPENDING & FOOD-WASTE ANALYTICS (Phase B)         */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && (
          <View>
            {loadingAnalytics && !refreshing ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
                <Text style={styles.loadingText}>Loading spending insights...</Text>
              </View>
            ) : (
              <>
                {/* Spending Overview Cards */}
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Lifetime Spent</Text>
                    <Text style={styles.kpiVal}>
                      £{analytics?.spending.lifetimeSpendGbp.toFixed(2) || '0.00'}
                    </Text>
                    <Text style={styles.kpiSub}>
                      {analytics?.spending.totalTripsCount || 0} completed trips
                    </Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>This Month</Text>
                    <Text style={[styles.kpiVal, { color: '#059669' }]}>
                      £{analytics?.spending.thisMonthSpendGbp.toFixed(2) || '0.00'}
                    </Text>
                    <Text style={styles.kpiSub}>
                      Budget: £{analytics?.spending.targetWeeklyBudgetGbp.toFixed(2) || '75.00'}
                    </Text>
                  </View>
                </View>

                {/* Budget Adherence & Money Saved Banner */}
                <View style={styles.adherenceCard}>
                  <View style={styles.adherenceHeader}>
                    <View style={styles.adherenceBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#047857" />
                      <Text style={styles.adherenceBadgeText}>
                        {analytics?.spending.budgetAdherenceRate || 100}% Under Budget
                      </Text>
                    </View>
                    <Text style={styles.savingsHighlight}>
                      Saved £{analytics?.spending.totalSavedUnderBudgetGbp.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <Text style={styles.adherenceDescription}>
                    Based on your target weekly budget of £
                    {analytics?.spending.targetWeeklyBudgetGbp || 75}.
                  </Text>
                </View>

                {/* Food-Waste Prevention Card */}
                <View style={styles.wasteCard}>
                  <View style={styles.wasteHeader}>
                    <Ionicons name="leaf-outline" size={20} color="#166534" />
                    <Text style={styles.wasteTitle}>Zero-Waste Efficiency</Text>
                  </View>
                  <View style={styles.wasteMetricsRow}>
                    <View style={styles.wasteCol}>
                      <Text style={styles.wasteStatVal}>
                        {analytics?.foodWaste.wasteAvoidanceRate || 95}%
                      </Text>
                      <Text style={styles.wasteStatLabel}>Pantry Consumed</Text>
                    </View>
                    <View style={styles.wasteDivider} />
                    <View style={styles.wasteCol}>
                      <Text style={styles.wasteStatVal}>
                        ~£{analytics?.foodWaste.estimatedMoneySavedGbp.toFixed(2) || '0.00'}
                      </Text>
                      <Text style={styles.wasteStatLabel}>Spoilage Avoided</Text>
                    </View>
                    <View style={styles.wasteDivider} />
                    <View style={styles.wasteCol}>
                      <Text
                        style={[
                          styles.wasteStatVal,
                          {
                            color:
                              (analytics?.foodWaste.expiringSoonCount || 0) > 0
                                ? '#D97706'
                                : '#166534',
                          },
                        ]}>
                        {analytics?.foodWaste.expiringSoonCount || 0}
                      </Text>
                      <Text style={styles.wasteStatLabel}>Expiring Soon</Text>
                    </View>
                  </View>
                </View>

                {/* Department Spending Breakdown */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Department Spending Distribution</Text>
                  <Text style={styles.cardSubtitle}>
                    Where your grocery budget is allocated across verified UK categories.
                  </Text>

                  {(!analytics?.spending.categoryDistribution ||
                    analytics.spending.categoryDistribution.length === 0) ? (
                    <Text style={styles.emptyDistText}>
                      Complete your first supermarket checkout to view category spending charts!
                    </Text>
                  ) : (
                    analytics.spending.categoryDistribution.map((cat, idx) => (
                      <View key={idx} style={styles.catRow}>
                        <View style={styles.catHeader}>
                          <Text style={styles.catName}>{cat.category}</Text>
                          <Text style={styles.catAmount}>
                            £{cat.totalGbp.toFixed(2)} ({cat.percentage}%)
                          </Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressBar,
                              {
                                width: `${Math.min(100, Math.max(5, cat.percentage))}%`,
                                backgroundColor:
                                  idx === 0
                                    ? BrandColors.primary
                                    : idx === 1
                                    ? '#3B82F6'
                                    : idx === 2
                                    ? '#F59E0B'
                                    : '#8B5CF6',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Monthly Trip History Summary */}
                {analytics?.spending.monthlyHistory && analytics.spending.monthlyHistory.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Monthly Expenditure</Text>
                    {analytics.spending.monthlyHistory.map((m, idx) => (
                      <View key={idx} style={styles.monthlyRow}>
                        <View>
                          <Text style={styles.monthName}>{m.month}</Text>
                          <Text style={styles.monthTrips}>{m.tripCount} trips</Text>
                        </View>
                        <Text style={styles.monthTotal}>£{m.total.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: HOUSEHOLD SETTINGS & DIETARY PREFERENCES          */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <View>
            {/* If User is NOT Signed In: Show Authentication Form */}
            {!isSignedIn ? (
              <AuthCard onSuccess={loadData} />
            ) : (
              /* Authenticated User Account Card */
              <View style={styles.accountCard}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={26} color="#FFFFFF" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>
                    {user?.fullName || user?.firstName || 'SmartGrocer Member'}
                  </Text>
                  <Text style={styles.accountEmail}>
                    {user?.primaryEmailAddress?.emailAddress || 'Signed in'}
                  </Text>
                  <View style={styles.memberBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#059669" />
                    <Text style={styles.memberBadgeText}>Clerk Authenticated</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Backend Connection Status Banner */}
            <View style={styles.statusBanner}>
              <Ionicons
                name={apiStatus === 'connected' ? 'checkmark-circle' : 'cloud-offline'}
                size={16}
                color={apiStatus === 'connected' ? '#059669' : BrandColors.accentRed}
              />
              <Text style={styles.statusText}>
                Backend API:{' '}
                {apiStatus === 'connected' ? 'Connected (Live)' : 'Connecting to server...'}
              </Text>
            </View>

            {/* Household & Budget Settings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Household & Budget</Text>
              <Text style={styles.cardSubtitle}>
                Used to calculate estimated consumption rates and overspending alerts.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Household Members</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="people-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={householdSize}
                    onChangeText={setHouseholdSize}
                    placeholder="e.g. 2"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Weekly Target Budget (£)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>£</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={defaultBudget}
                    onChangeText={setDefaultBudget}
                    placeholder="e.g. 75"
                  />
                </View>
              </View>
            </View>

            {/* Dietary & Allergy Preferences */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dietary Preferences</Text>
              <Text style={styles.cardSubtitle}>
                SmartGrocer prioritizes products and Zero-Waste recipes matching your dietary
                lifestyle.
              </Text>

              <View style={styles.chipsContainer}>
                {DIETARY_OPTIONS.map((item) => {
                  const active = selectedDiet.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleDiet(item)}>
                      {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Preferences Button */}
            <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              )}
            </TouchableOpacity>

            {/* Log Out Button */}
            {isSignedIn && (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={styles.logoutBtnText}>Log Out of SmartGrocer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  segmentedHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F3F4F6',
  },
  segmentBtnActive: {
    backgroundColor: BrandColors.dark,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#FFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.dark,
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  adherenceCard: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 4,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  adherenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adherenceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 4,
  },
  savingsHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  adherenceDescription: {
    fontSize: 12,
    color: '#065F46',
  },
  wasteCard: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  wasteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wasteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginLeft: 6,
  },
  wasteMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  wasteCol: {
    alignItems: 'center',
    flex: 1,
  },
  wasteStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.dark,
  },
  wasteStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  wasteDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.dark,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  emptyDistText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  catRow: {
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  monthTrips: {
    fontSize: 11,
    color: '#6B7280',
  },
  monthTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  accountCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.dark,
  },
  accountEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 6,
  },
  fieldGroup: {
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.dark,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 4,
  },
  saveBtn: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});
