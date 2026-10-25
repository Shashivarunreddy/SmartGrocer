import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { BrandColors } from '@/constants/Colors';

export function AuthCard({ onSuccess }: { onSuccess?: () => void }) {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    if (!isSignInLoaded || !signIn) return;
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        Alert.alert('Welcome Back! 🎉', 'You are now signed in to SmartGrocer.');
        onSuccess?.();
      } else {
        setErrorMessage(`Sign in incomplete: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to sign in';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!email.trim() || !password) {
      setErrorMessage('Please enter email and a strong password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        Alert.alert('Account Created! 🎉', 'Welcome to SmartGrocer.');
        onSuccess?.();
      } else {
        // Send email verification code
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to register';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit code sent to your email.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        Alert.alert('Email Verified! 🎉', 'Your SmartGrocer account is ready.');
        setPendingVerification(false);
        onSuccess?.();
      } else {
        setErrorMessage('Verification incomplete. Please check the code.');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Verification failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-open-outline" size={28} color={BrandColors.primary} />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to <Text style={{ fontWeight: '700' }}>{email}</Text>.
        </Text>

        {errorMessage.length > 0 && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#9CA3AF"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          disabled={loading}
          onPress={handleVerifyCode}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setPendingVerification(false);
            setErrorMessage('');
          }}>
          <Text style={styles.cancelBtnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
          onPress={() => {
            setMode('signin');
            setErrorMessage('');
          }}>
          <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
          onPress={() => {
            setMode('signup');
            setErrorMessage('');
          }}>
          <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        {mode === 'signin' ? 'Sign in to SmartGrocer' : 'Create Free Account'}
      </Text>
      <Text style={styles.subtitle}>
        {mode === 'signin'
          ? 'Sync your shopping lists, budget tracking, and pantry across devices.'
          : 'Get personalized grocery replenishment alerts and ML bill savings.'}
      </Text>

      {errorMessage.length > 0 && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Email Input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.input}
            placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter password'}
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.primaryBtn}
        disabled={loading}
        onPress={mode === 'signin' ? handleSignIn : handleSignUp}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1F2937',
    fontWeight: '700',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F8E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
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
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  primaryBtn: {
    backgroundColor: '#84C225',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
