import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import { api, ChatAssistantResponse } from '@/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  '🛒 What do I need to buy?',
  '⏳ What is expiring soon?',
  '🍳 Suggest a meal from my pantry',
  '💰 How is my grocery budget?',
];

export default function AIChatModal({ visible, onClose }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! 👋 I'm your SmartGrocer Assistant. With live access to your Python replenishment predictions and pantry expiry tracker, ask me anything like 'What do I need?' or 'What should I cook tonight?'",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const res = await api.chatWithAssistant(query);
      const data: ChatAssistantResponse = res.data;

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: data.reply || "I analyzed your groceries and couldn't find any specific alerts.",
        products: data.suggestedProducts,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Sorry, I couldn't reach the grocery intelligence service: ${err.message || 'Unknown error'}. Please try again!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProductToList = async (prod: { id: string; name: string }) => {
    try {
      const listsRes = await api.getShoppingLists();
      const lists = listsRes?.data || [];
      let targetList = lists.find(
        (l: any) => l.status === 'ACTIVE' || l.status === 'DRAFT'
      );

      if (!targetList) {
        const createRes = await api.createShoppingList('My Smart List', 50, 'GBP');
        targetList = createRes.data;
      }

      await api.addItemToList(targetList.id, prod.id, 1, 'Added via AI Chat');
      setAddedMap((prev) => ({ ...prev, [prod.id]: true }));
      Alert.alert('Added! 🛒', `Added "${prod.name}" to your shopping list.`);
    } catch (err: any) {
      Alert.alert('Error', 'Could not add to list: ' + err.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.avatarBox}>
                <Ionicons name="sparkles" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>SmartGrocer AI</Text>
                <Text style={styles.headerSub}>Gemini & Python Forecasting</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.btnClose}>
              <Ionicons name="close-circle" size={26} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgRow,
                  m.role === 'user' ? styles.msgRowUser : styles.msgRowAi,
                ]}>
                {m.role === 'assistant' && (
                  <View style={styles.botIconCircle}>
                    <Ionicons name="sparkles" size={13} color="#FFF" />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                  ]}>
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi,
                    ]}>
                    {m.text}
                  </Text>

                  {/* Suggested Products Action Cards */}
                  {m.products && m.products.length > 0 && (
                    <View style={styles.productsContainer}>
                      <Text style={styles.productsHeading}>Suggested items to replenish:</Text>
                      {m.products.map((p) => {
                        const isAdded = addedMap[p.id];
                        return (
                          <View key={p.id} style={styles.productCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.productCardName} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={styles.productCardPrice}>
                                £{Number(p.price).toFixed(2)} · {p.reason}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.btnProductAdd,
                                isAdded && styles.btnProductAdded,
                              ]}
                              disabled={isAdded}
                              onPress={() => handleAddProductToList(p)}>
                              <Text
                                style={[
                                  styles.btnProductAddText,
                                  isAdded && styles.btnProductAddedText,
                                ]}>
                                {isAdded ? '✓ Added' : '+ Add'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {loading && (
              <View style={[styles.msgRow, styles.msgRowAi]}>
                <View style={styles.botIconCircle}>
                  <Ionicons name="sparkles" size={13} color="#FFF" />
                </View>
                <View style={[styles.bubble, styles.bubbleAi, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.loadingBubbleText}>
                    Analyzing Python forecasts & pantry...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompts */}
          <View style={styles.quickPromptsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsScroll}>
              {QUICK_PROMPTS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPromptChip}
                  onPress={() => handleSendMessage(q)}>
                  <Text style={styles.quickPromptText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask: 'What do I need?' or 'What's expiring?'..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.btnSend,
                (!inputText.trim() || loading) && styles.btnSendDisabled,
              ]}
              disabled={!inputText.trim() || loading}
              onPress={() => handleSendMessage()}>
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  btnClose: {
    padding: 2,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  botIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextAi: {
    color: '#1F2937',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingBubbleText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  productsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  productsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  productCardPrice: {
    fontSize: 10,
    color: '#059669',
    marginTop: 1,
  },
  btnProductAdd: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  btnProductAdded: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  btnProductAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  btnProductAddedText: {
    color: '#6B7280',
  },
  quickPromptsContainer: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickPromptText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  btnSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSendDisabled: {
    opacity: 0.4,
  },
});
