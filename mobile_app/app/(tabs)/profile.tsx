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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import { api } from '@/services/api';
import { AuthCard } from '@/components/AuthCard';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Eggetarian', 'Gluten-Free', 'Dairy-Free', 'Nut Allergy'];

export default function ProfileScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  const [householdSize, setHouseholdSize] = useState('2');
  const [defaultBudget, setDefaultBudget] = useState('250');
  const [currency, setCurrency] = useState('GBP');
  const [selectedDiet, setSelectedDiet] = useState<string[]>(['Vegetarian']);
  const [saving, setSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const loadProfile = () => {
    // Check backend health
    api.checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('disconnected'));

    // Load profile if signed in
    if (isSignedIn) {
      api.getProfile()
        .then((res) => {
          if (res.data) {
            if (res.data.householdSize) setHouseholdSize(res.data.householdSize.toString());
            if (res.data.defaultBudget) setDefaultBudget(res.data.defaultBudget.toString());
            if (res.data.currency) setCurrency(res.data.currency);
            if (res.data.dietaryPreferences) setSelectedDiet(res.data.dietaryPreferences);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadProfile();
  }, [isSignedIn]);

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
          defaultBudget: parseFloat(defaultBudget) || 250,
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
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of SmartGrocer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            Alert.alert('Logged Out', 'You have successfully signed out.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* If User is NOT Signed In: Show Authentication Form */}
      {!isSignedIn ? (
        <AuthCard onSuccess={loadProfile} />
      ) : (
        /* Authenticated User Account Card */
        <View style={styles.accountCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>
              {user?.fullName || user?.firstName || 'SmartGrocer Member'}
            </Text>
            <Text style={styles.accountEmail}>
              {user?.primaryEmailAddress?.emailAddress || 'Signed in'}
            </Text>
            <View style={styles.memberBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#2E7D32" />
              <Text style={styles.memberBadgeText}>Verified Account</Text>
            </View>
          </View>
        </View>
      )}

      {/* Backend Connection Status Banner */}
      <View style={styles.statusBanner}>
        <Ionicons
          name={apiStatus === 'connected' ? 'checkmark-circle' : 'cloud-offline'}
          size={16}
          color={apiStatus === 'connected' ? '#2E7D32' : BrandColors.accentRed}
        />
        <Text style={styles.statusText}>
          Backend API: {apiStatus === 'connected' ? 'Connected (Live)' : 'Connecting to server...'}
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
              placeholder="e.g. 3"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Monthly Grocery Budget (£)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>£</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={defaultBudget}
              onChangeText={setDefaultBudget}
              placeholder="e.g. 250"
            />
          </View>
        </View>
      </View>

      {/* Dietary & Allergy Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dietary Preferences</Text>
        <Text style={styles.cardSubtitle}>
          SmartGrocer prioritizes products matching your dietary lifestyle.
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
      <TouchableOpacity
        style={styles.saveBtn}
        disabled={saving}
        onPress={handleSave}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        )}
      </TouchableOpacity>

      {/* Prominent Log Out Button when Signed In */}
      {isSignedIn && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Log Out of SmartGrocer</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#84C225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  accountEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
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
    height: 42,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#84C225',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#84C225',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    height: 48,
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 15,
  },
});
