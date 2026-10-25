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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSSO } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/constants/Colors';

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Google One-Tap SSO via Clerk
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage('');

      // In Expo Go, custom schemes like mobileapp:// are not registered in the OS.
      // We must construct the Expo Go URL using Constants.expoConfig?.hostUri:
      let redirectUrl = AuthSession.makeRedirectUri();
      const hostUri = Constants.expoConfig?.hostUri;
      if (hostUri) {
        redirectUrl = `exp://${hostUri}/--/oauth-callback`;
      }
      console.log('Google SSO Redirect URL for Expo Go:', redirectUrl);

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.log('Google Auth Error:', err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Google Sign-In failed. Please use email/password.';
      setErrorMessage(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // 2. Email & Password Sign In
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
        router.replace('/(tabs)');
      } else {
        setErrorMessage(`Sign in incomplete: ${result.status}`);
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Invalid credentials. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Sign Up
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
        router.replace('/(tabs)');
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Failed to create account.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Email Verification Code
  const handleVerifyCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
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
        router.replace('/(tabs)');
      } else {
        setErrorMessage('Verification incomplete. Please check the code.');
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Verification failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Top Branding Section */}
        <View style={styles.heroBanner}>
          <View style={styles.brandIcon}>
            <Ionicons name="basket" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>SmartGrocer</Text>
          <Text style={styles.brandTagline}>⚡ Fresh Groceries & Everyday Low Prices</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Tab Switcher */}
          <View style={styles.tabRow}>
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
          </View>

          {/* Error Banner */}
          {errorMessage.length > 0 && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {pendingVerification ? (
            /* Email Code Verification */
            <View style={styles.verifyBox}>
              <Ionicons name="mail-unread" size={36} color={BrandColors.primary} />
              <Text style={styles.verifyTitle}>Verify Your Email</Text>
              <Text style={styles.verifySub}>
                Enter the code sent to <Text style={{ fontWeight: '700' }}>{email}</Text>
              </Text>

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
                style={styles.primaryBtn}
                disabled={loading}
                onPress={handleVerifyCode}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => setPendingVerification(false)}>
                <Text style={styles.linkBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Sign In / Sign Up Form */
            <View>
              {/* Google Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                disabled={googleLoading}
                onPress={handleGoogleSignIn}>
                {googleLoading ? (
                  <ActivityIndicator color="#1F2937" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR WITH EMAIL</Text>
                <View style={styles.dividerLine} />
              </View>

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
                    placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter password'}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={loading}
                onPress={mode === 'signin' ? handleSignIn : handleSignUp}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Free Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Guest Skip Option */}
        <TouchableOpacity
          style={styles.guestBtn}
          onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.guestBtnText}>Browse Catalogue as Guest →</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Ionicons name="shield-checkmark" size={14} color="#689F38" />
          <Text style={styles.footerText}>Secured by Clerk Authentication</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroBanner: {
    backgroundColor: '#84C225',
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#84C225',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF8E1',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 16,
    marginTop: -16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  tabRow: {
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
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    height: 46,
    marginBottom: 14,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
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
  primaryBtn: {
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
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  errorBox: {
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
  verifyBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  verifyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  verifySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  linkBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  linkBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  guestBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#689F38',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
