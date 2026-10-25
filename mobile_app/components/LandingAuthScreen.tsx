import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { BrandColors } from '@/constants/Colors';

export function LandingAuthScreen() {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
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
      } else {
        setErrorMessage(`Sign in status: ${result.status}`);
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
      setErrorMessage('Please enter email and password.');
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
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to create account';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the verification code.');
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
      } else {
        setErrorMessage('Verification incomplete. Please re-check your code.');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Verification failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Top Fixed Hero Header (BigBasket Leaf Green) */}
        <View style={styles.heroSection}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="basket" size={28} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>SmartGrocer</Text>
              <Text style={styles.brandSubtitle}>⚡ Smart UK Grocery Assistant</Text>
            </View>
          </View>

          <Text style={styles.heroPunchline}>
            Smart ML bill estimates, pantry expiry tracking, and zero grocery waste.
          </Text>

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
              <Text style={styles.pillText}>100+ Products</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="calculator" size={13} color="#FFFFFF" />
              <Text style={styles.pillText}>Live Bill Predictor</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="time" size={13} color="#FFFFFF" />
              <Text style={styles.pillText}>Expiry Alerts</Text>
            </View>
          </View>
        </View>

        {/* Fixed Non-Scrollable Authentication Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.cardContainer}>
          <View style={styles.authCard}>
            {/* Mode Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
                onPress={() => {
                  setMode('signup');
                  setErrorMessage('');
                  setPendingVerification(false);
                }}>
                <Text style={[styles.tabBtnText, mode === 'signup' && styles.tabBtnTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
                onPress={() => {
                  setMode('signin');
                  setErrorMessage('');
                  setPendingVerification(false);
                }}>
                <Text style={[styles.tabBtnText, mode === 'signin' && styles.tabBtnTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {pendingVerification ? (
              /* Email Verification Step */
              <View style={styles.verificationContainer}>
                <View style={styles.verificationIcon}>
                  <Ionicons name="mail-open" size={26} color={BrandColors.primaryDark} />
                </View>
                <Text style={styles.formTitle}>Verify Your Email</Text>
                <Text style={styles.formSubtitle}>
                  Enter the 6-digit code sent to <Text style={{ fontWeight: '700' }}>{email}</Text>
                </Text>

                {errorMessage.length > 0 && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  disabled={loading}
                  onPress={handleVerifyCode}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Verify & Enter SmartGrocer</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setPendingVerification(false)}>
                  <Text style={styles.backBtnText}>Back to Sign Up</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Sign In / Sign Up Form */
              <View>
                <Text style={styles.formTitle}>
                  {mode === 'signup' ? 'Get Started for Free' : 'Welcome Back'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {mode === 'signup'
                    ? 'Create your account to sync lists and track your pantry.'
                    : 'Sign in to access your saved lists and budget estimates.'}
                </Text>

                {errorMessage.length > 0 && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

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
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter password'}
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  disabled={loading}
                  onPress={mode === 'signup' ? handleSignUp : handleSignIn}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {mode === 'signup' ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Fixed Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={14} color="#689F38" />
          <Text style={styles.footerText}>
            Secured by Clerk • PostgreSQL & Prisma 7 Backend
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  heroSection: {
    backgroundColor: '#84C225',
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#84C225',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF8E1',
    marginTop: 1,
  },
  heroPunchline: {
    fontSize: 13,
    color: '#F1F8E9',
    lineHeight: 18,
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#1F2937',
    fontWeight: '800',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
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
    color: '#374151',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  actionBtn: {
    backgroundColor: '#84C225',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#84C225',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F8E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
