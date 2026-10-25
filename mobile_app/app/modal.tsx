import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthCard } from '@/components/AuthCard';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AuthCard onSuccess={() => router.back()} />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
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
    paddingTop: 24,
  },
});
