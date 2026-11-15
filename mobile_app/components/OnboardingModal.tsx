import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import { api } from '@/services/api';

const DIETARY_OPTIONS = [
  { label: 'Vegetarian', icon: '🌿' },
  { label: 'Vegan', icon: '🌱' },
  { label: 'Eggetarian', icon: '🥚' },
  { label: 'Gluten-Free', icon: '🌾' },
  { label: 'Dairy-Free', icon: '🥛' },
  { label: 'Nut Allergy', icon: '🥜' },
  { label: 'Halal', icon: '☪️' },
  { label: 'Kosher', icon: '✡️' },
];

export function OnboardingModal() {
  const { isSignedIn, isLoaded } = useAuth();
  const [visible, setVisible] = useState(false);
  const [householdSize, setHouseholdSize] = useState('2');
  const [budget, setBudget] = useState('75');
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setVisible(false);
      return;
    }

    let isMounted = true;
    api
      .getProfile()
      .then((res: any) => {
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
          if (profile?.householdSize) setHouseholdSize(String(profile.householdSize));
          if (profile?.defaultBudget) setBudget(String(profile.defaultBudget));
          if (Array.isArray(profile?.dietaryPreferences)) setSelectedDiet(profile.dietaryPreferences);
          setVisible(true);
        } else {
          setVisible(false);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  if (!visible) return null;

  const toggleDiet = (pref: string) => {
    setSelectedDiet((prev) =>
      prev.includes(pref) ? prev.filter((d) => d !== pref) : [...prev, pref]
    );
  };

  const handleSave = async () => {
    const hSize = parseInt(householdSize, 10);
    const bAmt = parseFloat(budget);

    if (isNaN(hSize) || hSize < 1) {
      Alert.alert('Invalid Household', 'Please enter a household size of at least 1 person.');
      return;
    }
    if (isNaN(bAmt) || bAmt < 5) {
      Alert.alert('Invalid Budget', 'Please enter a target weekly budget of at least £5.');
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile({
        householdSize: hSize,
        defaultBudget: bAmt,
        currency: 'GBP',
        dietaryPreferences: selectedDiet,
        isOnboarded: true,
      });

      setVisible(false);
      Alert.alert('Profile Complete! 🎉', 'Your household & target budget have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Banner */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Welcome to SmartGrocer! 🎉</Text>
            <Text style={styles.heroSubtitle}>
              To customize your grocery analytics, demand predictions, and budget tracking, please set up your household details.
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* 1. Household Size */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={18} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>Household Size (Required)</Text>
              </View>
              <Text style={styles.sectionHelp}>How many people are you shopping for?</Text>
              <View style={styles.presetRow}>
                {['1', '2', '3', '4', '5'].map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.presetBtn, householdSize === sz && styles.presetBtnActive]}
                    onPress={() => setHouseholdSize(sz)}>
                    <Text style={[styles.presetBtnText, householdSize === sz && styles.presetBtnTextActive]}>
                      {sz} {sz === '1' ? 'Person' : 'People'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customInputRow}>
                <Text style={styles.customInputLabel}>Or enter exact count:</Text>
                <TextInput
                  style={styles.numberInput}
                  keyboardType="number-pad"
                  value={householdSize}
                  onChangeText={setHouseholdSize}
                />
              </View>
            </View>

            {/* 2. Target Budget */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wallet-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>Weekly Grocery Budget (Required)</Text>
              </View>
              <Text style={styles.sectionHelp}>What is your target budget per week?</Text>
              <View style={styles.presetRow}>
                {['40', '60', '75', '100'].map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.presetBtn, budget === b && styles.presetBtnActive]}
                    onPress={() => setBudget(b)}>
                    <Text style={[styles.presetBtnText, budget === b && styles.presetBtnTextActive]}>
                      £{b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.currencyPrefix}>£</Text>
                <TextInput
                  style={styles.budgetInput}
                  keyboardType="decimal-pad"
                  placeholder="Custom amount"
                  placeholderTextColor="#9CA3AF"
                  value={budget}
                  onChangeText={setBudget}
                />
              </View>
            </View>

            {/* 3. Dietary Preferences */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="nutrition-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>Dietary Preferences (Optional)</Text>
              </View>
              <Text style={styles.sectionHelp}>Select any dietary habits or allergies:</Text>
              <View style={styles.chipsGrid}>
                {DIETARY_OPTIONS.map((opt) => {
                  const isSelected = selectedDiet.includes(opt.label);
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleDiet(opt.label)}>
                      <Text style={styles.chipIcon}>{opt.icon}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>Complete Setup & Start Shopping</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footerNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#689F38" />
              <Text style={styles.footerNoteText}>You can update household and budget anytime in Profile</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#84C225',
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#E8F5E9',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionHelp: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: '#84C225',
    borderColor: '#84C225',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customInputLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  numberInput: {
    width: 60,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#F1F8E9',
    borderColor: '#84C225',
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#84C225',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#84C225',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});

